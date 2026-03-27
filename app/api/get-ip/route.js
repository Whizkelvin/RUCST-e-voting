// src/app/api/get-ip/route.js
import { NextResponse } from 'next/server';

export async function GET(request) {
  // Get client IP from headers
  const forwardedFor = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  
  let ip = 'unknown';
  
  if (forwardedFor) {
    ip = forwardedFor.split(',')[0];
  } else if (realIp) {
    ip = realIp;
  }
  
  return NextResponse.json({ ip });
}