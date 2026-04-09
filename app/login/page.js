const handleVoterLogin = useCallback(async (email, schoolId) => {
  setIsLoading(true);
  try {
    const cleanEmail = email.toLowerCase().trim();
    const cleanSchoolId = schoolId.trim().padStart(8, '0');
    
    // ========== STEP 1: GET VOTER DATA ==========
    const { data: voter, error: voterError } = await supabase
      .from('voters')
      .select('*')
      .eq('email', cleanEmail)
      .eq('school_id', cleanSchoolId)
      .maybeSingle();
    
    if (voterError || !voter) {
      setLoginAttempts(prev => prev + 1);
      toast.error('Invalid credentials. Please try again.');
      setIsLoading(false);
      return;
    }
    
    // =