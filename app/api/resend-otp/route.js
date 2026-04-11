// app/api/auth/resend-otp/route.js
import { supabase } from '@/lib/supabaseClient';
import { OTPHash } from '@/utils/otpHash';
import { NextResponse } from 'next/server';

export async function POST(req) {
  try {
    const { email, schoolId } = await req.json();
    
    // Find voter
    const { data: voter, error: voterError } = await supabase
      .from('voters')
      .select('id, name')
      .eq('email', email)
      .eq('school_id', schoolId)
      .single();
    
    if (!voter) {
      return NextResponse.json({ error: 'Voter not found' }, { status: 404 });
    }
    
    // Rate limiting
    const { data: recentOtps } = await supabase
      .from('otp_codes')
      .select('created_at')
      .eq('email', email)
      .gte('created_at', new Date(Date.now() - 15 * 60000).toISOString());
    
    if (recentOtps && recentOtps.length >= 3) {
      return NextResponse.json({ 
        error: 'Too many OTP requests. Please wait 15 minutes.' 
      }, { status: 429 });
    }
    
    // Generate new plain OTP
    const plainOTP = OTPHash.generateOTP();
    
    // Hash it for storage
    const hashedOTP = await OTPHash.hash(plainOTP);
    const otpExpiry = new Date(Date.now() + 15 * 60000);
    
    // Delete old OTPs
    await supabase.from('otp_codes').delete().eq('voter_id', voter.id);
    
    // Store ONLY the hash
    const { error: insertError } = await supabase.from('otp_codes').insert({
      voter_id: voter.id,
      email: email,
      school_id: schoolId,
      code_hash: hashedOTP,  // ✅ Store hash, not plain text
      expires_at: otpExpiry.toISOString(),
      used: false,
      attempts: 0,
      max_attempts: 3,
      resend_count: (recentOtps?.length || 0) + 1
    });
    
    if (insertError) {
      return NextResponse.json({ error: 'Failed to generate OTP' }, { status: 500 });
    }
    
    // Send plain OTP via email
    const emailResponse = await fetch(`${process.env.NEXTAUTH_URL}/api/send-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: email,
        otp: plainOTP,  // ✅ Send plain OTP to user
        name: voter.name,
        expiresIn: 15
      })
    });
    
    return NextResponse.json({ success: true });
    
  } catch (error) {
    console.error('Resend OTP error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}