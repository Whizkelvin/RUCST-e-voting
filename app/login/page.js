import React, { useState } from 'react';
import './Login.css';

const LoginPage = () => {
    const [isDarkMode, setIsDarkMode] = useState(false);
    const [passwordVisible, setPasswordVisible] = useState(false);

    const toggleTheme = () => {
        setIsDarkMode(!isDarkMode);
    };

    const togglePasswordVisibility = () => {
        setPasswordVisible(!passwordVisible);
    };

    return (
        <div className={`login-container ${isDarkMode ? 'dark' : 'light'}`}>  
            <div className='theme-toggle'>
                <label className='switch'>
                    <input type='checkbox' onChange={toggleTheme} />
                    <span className='slider'></span>
                </label>
                <span>{isDarkMode ? 'Dark Mode' : 'Light Mode'}</span>
            </div>
            <h1>Login</h1>
            <form>
                <div className='input-group'>
                    <label htmlFor='username'>Username</label>
                    <input type='text' id='username' required />
                </div>
                <div className='input-group'>
                    <label htmlFor='password'>Password</label>
                    <input type={passwordVisible ? 'text' : 'password'} id='password' required />
                    <button type='button' onClick={togglePasswordVisibility} className='toggle-visibility'>
                        {passwordVisible ? 'Hide' : 'Show'}
                    </button>
                </div>
                <button type='submit' className='login-button'>Log In</button>
            </form>
        </div>
    );
};

export default LoginPage;

/* CSS Styles */
/* Login.css */
.login-container {
    background: rgba(255, 255, 255, 0.2);
    border-radius: 15px;
    backdrop-filter: blur(10px);
    border: 1px solid rgba(255, 255, 255, 0.5);
    padding: 20px;
    max-width: 400px;
    margin: auto;
    box-shadow: 0 4px 30px rgba(0, 0, 0, 0.1);
    transition: background 0.3s ease;
}

.dark {
    background: rgba(0, 0, 0, 0.8);
    color: white;
}

.light {
    color: black;
}

.theme-toggle {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 20px;
}

.input-group {
    margin-bottom: 15px;
}

.login-button {
    width: 100%;
    padding: 10px;
    background-color: #007bff;
    color: white;
    border: none;
    border-radius: 5px;
    cursor: pointer;
    transition: background-color 0.3s;
}

.login-button:hover {
    background-color: #0056b3;
}

.toggle-visibility {
    background: none;
    border: none;
    cursor: pointer;
    color: inherit;
    padding-left: 10px;
}

@media (max-width: 600px) {
    .login-container {
        padding: 15px;
        width: 90%;
    }
}