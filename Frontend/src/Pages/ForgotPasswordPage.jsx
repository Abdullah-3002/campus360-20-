// src/pages/ForgotPasswordPage.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { requestPasswordReset } from '../services/authService';

const MailIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
        <polyline points="22,6 12,13 2,6"></polyline>
    </svg>
);

const ForgotPasswordPage = () => {
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    const handleReset = async (e) => {
        e.preventDefault();
        if (!email) {
            setError('Please enter your email.');
            return;
        }
        setLoading(true);
        setError('');
        setMessage('');
        try {
            const data = await requestPasswordReset(email);
            setMessage(data.message || 'If an account exists for this email, a reset link has been sent.');
            if (data.reset_link) {
                setMessage(`${data.message || 'Reset link generated.'} (Dev: ${data.reset_link})`);
            }
        } catch (err) {
            setError(err.response?.data?.email?.[0] || err.response?.data?.error || 'Unable to process request.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-page">
            <div className="auth-split-container fade-in">
                <div className="auth-left-panel">
                    <div className="auth-left-content" style={{ textAlign: 'center' }}>
                        <h1 style={{ fontSize: '3rem', textShadow: '0 4px 10px rgba(0,0,0,0.3)' }}>Welcome To <br />Campus 360</h1>
                    </div>
                </div>

                <div className="auth-right-panel">
                    <div className="auth-card" style={{ margin: '0 auto', width: '100%', maxWidth: '400px' }}>
                        <div className="orbit-branding">Campus 360</div>
                        <h2 style={{ marginTop: '20px' }}>Reset Your Password</h2>
                        <p className="subtitle">Enter your email and we'll send you a link to reset your password.</p>

                        <form onSubmit={handleReset}>
                            <div className="form-group" style={{ marginBottom: '25px' }}>
                                <label style={{ fontSize: '0.9rem', color: 'var(--dark-gray)', marginBottom: '5px', display: 'block' }}>Email Address</label>
                                <div className="input-wrapper">
                                    <div className="input-icon"><MailIcon /></div>
                                    <input
                                        type="email"
                                        className="form-input-with-icon"
                                        placeholder="yourname@campus.edu"
                                        required
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                    />
                                </div>
                            </div>

                            {error && <p style={{ color: '#ef4444', marginBottom: '12px', fontSize: '0.9rem' }}>{error}</p>}
                            {message && <p style={{ color: '#16a34a', marginBottom: '12px', fontSize: '0.9rem' }}>{message}</p>}

                            <button type="submit" className="login-btn-full" disabled={loading}>
                                {loading ? 'Sending...' : 'SEND RESET LINK'}
                            </button>
                        </form>

                        <div className="register-link">
                            Don't have an account? <a href="#" onClick={(e) => { e.preventDefault(); navigate('/signup'); }}>Register Now</a>
                        </div>

                        <button onClick={() => navigate('/login')} style={{ width: '100%', background: 'transparent', border: 'none', color: '#9ca3af', marginTop: '20px', cursor: 'pointer', fontSize: '0.9rem' }}>
                            ← Back to Login
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ForgotPasswordPage;
