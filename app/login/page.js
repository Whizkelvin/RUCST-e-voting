// Improved login.js

import React, { useState } from 'react';
import './styles.css';  // Assuming you have some styles defined

const LoginPage = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            // Simulate a login API call
            await new Promise((resolve, reject) => {
                setTimeout(() => {
                    if (email === 'test@example.com' && password === 'password123') {
                        resolve('Login successful');
                    } else {
                        reject(new Error('Invalid credentials')); 
                    }
                }, 2000);
            });
            // Perform successful login actions
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className='login-container'>
            <form onSubmit={handleLogin} className={`login-form ${loading ? 'loading' : ''}`}> 
                <h2>Login</h2>
                <div className='form-group'>
                    <label htmlFor='email'>Email:</label>
                    <input
                        type='email'
                        id='email'
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                    />
                </div>
                <div className='form-group'>
                    <label htmlFor='password'>Password:</label>
                    <div className='password-container'>
                        <input
                            type={showPassword ? 'text' : 'password'}
                            id='password'
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                        <button type='button' onClick={() => setShowPassword(!showPassword)}> 
                            {showPassword ? 'Hide' : 'Show'}
                        </button>
                    </div>
                </div>
                {error && <div className='error-message'>{error}</div>}
                <button type='submit' disabled={loading} className='login-button'>
                    {loading ? 'Logging in...' : 'Login'}
                </button>
            </form>
        </div>
    );
};

export default LoginPage;