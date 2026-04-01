// Import necessary modules
import React, { useState } from 'react';
import { useHistory } from 'react-router-dom';

// Login component
const LoginPage = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [role, setRole] = useState('user'); // default to user
  const history = useHistory();

  const handleLogin = async (e) => {
    e.preventDefault();
    // Call to backend for login verification
    const response = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password, role }),
    });

    if (response.ok) {
      const { otpRequired } = await response.json();
      if (otpRequired) {
        // Proceed to handle OTP verification
        await verifyOtp();
      } else {
        // Successful login, redirect based on role
        redirectUser(role);
      }
    } else {
      // Handle login error
      alert('Login failed. Please check your credentials.');
    }
  };

  const verifyOtp = async () => {
    const response = await fetch('/api/verify-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, otp }),
    });

    if (response.ok) {
      alert('OTP verified successfully');
      redirectUser(role);
    } else {
      alert('OTP verification failed.');
    }
  };

  const redirectUser = (role) => {
    if (role === 'admin') {
      history.push('/admin-dashboard');
    } else {
      history.push('/user-dashboard');
    }
  };

  return (
    <div>
      <h2>Login</h2>
      <form onSubmit={handleLogin}>
        <input
          type="text"
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <select value={role} onChange={(e) => setRole(e.target.value)}>
          <option value="user">User</option>
          <option value="admin">Admin</option>
        </select>
        <button type="submit">Login</button>
      </form>
      <input
        type="text"
        placeholder="Enter OTP if required"
        value={otp}
        onChange={(e) => setOtp(e.target.value)}
      />
    </div>
  );
};

export default LoginPage;