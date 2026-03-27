import { supabase } from '@/lib/supabaseClient';

/**
 * Log system activity for audit purposes
 * @param {Object} logData - The log data to record
 * @param {string} logData.user_id - UUID of the user (optional for unauthenticated actions)
 * @param {string} logData.user_role - Role of the user (voter, admin, dean, etc.)
 * @param {string} logData.action - Action performed (login, vote, approve, etc.)
 * @param {string} logData.details - Detailed description of the action
 * @param {string} logData.ip_address - IP address of the user
 * @param {string} logData.status - Status of the action (success, failed, pending)
 * @returns {Promise<Object>} - Returns the created log entry or error
 */
export const logActivity = async ({
  user_id = null,
  user_role = 'unknown',
  action,
  details,
  ip_address = 'unknown',
  status = 'success'
}) => {
  try {
    const { data, error } = await supabase
      .from('audit_logs')
      .insert({
        user_id: user_id,
        user_role: user_role,
        action: action,
        details: details,
        ip_address: ip_address,
        status: status,
        timestamp: new Date().toISOString()
      })
      .select();

    if (error) throw error;
    
    return { success: true, data: data[0] };
    
  } catch (error) {
    // Silent fail - logging should not break the main function
    return { success: false, error: error.message };
  }
};

/**
 * Get client IP address from request
 * @returns {Promise<string>} - Client IP address
 */
export const getClientIP = async () => {
  try {
    const response = await fetch('/api/get-ip');
    const data = await response.json();
    return data.ip;
  } catch {
    return 'unknown';
  }
};

/**
 * Log user login attempt
 * @param {Object} params - Login attempt data
 * @returns {Promise<Object>} - Log result
 */
export const logLogin = async ({ email, user_role, success, ip_address }) => {
  return await logActivity({
    user_role: user_role,
    action: success ? 'login_success' : 'login_failed',
    details: `${success ? 'Successful' : 'Failed'} login attempt for ${email}`,
    ip_address: ip_address,
    status: success ? 'success' : 'failed'
  });
};

/**
 * Log vote casting
 * @param {Object} params - Vote data
 * @param {string} params.voter_id - UUID of the voter
 * @param {string} params.voter_name - Name of the voter
 * @param {string} params.ip_address - IP address of the voter
 * @param {boolean} params.success - Whether the vote was cast successfully
 * @param {string} [params.error] - Error message if vote failed
 * @returns {Promise<Object>} - Log result
 */
export const logVoteCast = async ({ voter_id, voter_name, ip_address, success, error = null }) => {
  return await logActivity({
    user_id: voter_id,
    user_role: 'voter',
    action: 'vote_cast',
    details: success 
      ? `${voter_name} successfully cast their vote` 
      : `${voter_name} failed to cast vote: ${error}`,
    ip_address: ip_address,
    status: success ? 'success' : 'failed'
  });
};

/**
 * Log vote with candidate details (legacy function for backward compatibility)
 * @param {Object} params - Vote data
 */
export const logVote = async ({ voter_id, voter_name, candidate_name, position, ip_address }) => {
  return await logActivity({
    user_id: voter_id,
    user_role: 'voter',
    action: 'vote_cast',
    details: `${voter_name} voted for ${candidate_name} as ${position}`,
    ip_address: ip_address,
    status: 'success'
  });
};

/**
 * Log candidate approval/rejection
 * @param {Object} params - Candidate approval data
 */
export const logCandidateAction = async ({ admin_id, admin_name, candidate_name, action, reason, ip_address }) => {
  return await logActivity({
    user_id: admin_id,
    user_role: 'dean',
    action: action === 'approve' ? 'candidate_approved' : 'candidate_rejected',
    details: `${admin_name} ${action}d candidate: ${candidate_name}${reason ? ` - Reason: ${reason}` : ''}`,
    ip_address: ip_address,
    status: 'success'
  });
};

/**
 * Log OTP generation
 * @param {Object} params - OTP generation data
 */
export const logOtpGeneration = async ({ voter_id, email, ip_address, success }) => {
  return await logActivity({
    user_id: voter_id,
    user_role: 'voter',
    action: 'otp_generated',
    details: `OTP ${success ? 'generated' : 'failed'} for ${email}`,
    ip_address: ip_address,
    status: success ? 'success' : 'failed'
  });
};

/**
 * Log OTP verification
 * @param {Object} params - OTP verification data
 */
export const logOtpVerification = async ({ voter_id, email, ip_address, success }) => {
  return await logActivity({
    user_id: voter_id,
    user_role: 'voter',
    action: 'otp_verified',
    details: `OTP verification ${success ? 'successful' : 'failed'} for ${email}`,
    ip_address: ip_address,
    status: success ? 'success' : 'failed'
  });
};

/**
 * Log election configuration changes
 * @param {Object} params - Election config data
 */
export const logElectionConfig = async ({ admin_id, admin_name, election_year, changes, ip_address }) => {
  return await logActivity({
    user_id: admin_id,
    user_role: 'admin',
    action: 'election_configured',
    details: `${admin_name} updated election ${election_year}: ${changes}`,
    ip_address: ip_address,
    status: 'success'
  });
};

/**
 * Log voter list upload
 * @param {Object} params - Voter upload data
 */
export const logVoterUpload = async ({ admin_id, admin_name, total_voters, ip_address }) => {
  return await logActivity({
    user_id: admin_id,
    user_role: 'it_admin',
    action: 'voters_uploaded',
    details: `${admin_name} uploaded ${total_voters} voters`,
    ip_address: ip_address,
    status: 'success'
  });
};

/**
 * Get audit logs with filters
 * @param {Object} filters - Filter parameters
 * @param {string} filters.user_id - Filter by user ID
 * @param {string} filters.user_role - Filter by user role
 * @param {string} filters.action - Filter by action type
 * @param {string} filters.status - Filter by status
 * @param {Date} filters.start_date - Filter by start date
 * @param {Date} filters.end_date - Filter by end date
 * @param {number} filters.limit - Limit results
 * @returns {Promise<Array>} - Array of audit logs
 */
export const getAuditLogs = async (filters = {}) => {
  try {
    let query = supabase
      .from('audit_logs')
      .select('*')
      .order('timestamp', { ascending: false });
    
    if (filters.user_id) {
      query = query.eq('user_id', filters.user_id);
    }
    
    if (filters.user_role) {
      query = query.eq('user_role', filters.user_role);
    }
    
    if (filters.action) {
      query = query.eq('action', filters.action);
    }
    
    if (filters.status) {
      query = query.eq('status', filters.status);
    }
    
    if (filters.start_date) {
      query = query.gte('timestamp', filters.start_date.toISOString());
    }
    
    if (filters.end_date) {
      query = query.lte('timestamp', filters.end_date.toISOString());
    }
    
    if (filters.limit) {
      query = query.limit(filters.limit);
    }
    
    const { data, error } = await query;
    
    if (error) throw error;
    
    return { success: true, data };
    
  } catch (error) {
    return { success: false, error: error.message };
  }
};

/**
 * Get audit logs summary statistics
 * @returns {Promise<Object>} - Summary statistics
 */
export const getAuditSummary = async () => {
  try {
    // Get total logs
    const { count: total_logs } = await supabase
      .from('audit_logs')
      .select('*', { count: 'exact', head: true });
    
    // Get logs by action type
    const { data: action_stats } = await supabase
      .from('audit_logs')
      .select('action, count')
      .group('action');
    
    // Get logs by status
    const { data: status_stats } = await supabase
      .from('audit_logs')
      .select('status, count')
      .group('status');
    
    // Get logs today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const { count: today_logs } = await supabase
      .from('audit_logs')
      .select('*', { count: 'exact', head: true })
      .gte('timestamp', today.toISOString());
    
    return {
      success: true,
      data: {
        total_logs,
        today_logs,
        action_stats,
        status_stats
      }
    };
    
  } catch (error) {
    return { success: false, error: error.message };
  }
};