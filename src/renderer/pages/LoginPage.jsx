import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import '../styles/auth.css';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState(1); // 1: Email, 2: OTP
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const sendOTP = async () => {
    if (!email) {
      toast.error('Please enter your email');
      return;
    }
    setLoading(true);
    try {
      const response = await window.api.auth.sendOTP(email);
      if (response.success) {
        setStep(2);
        toast.success('OTP sent to your email');
      } else {
        toast.error(response.message || 'Failed to send OTP');
      }
    } catch (error) {
      toast.error('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSendOTP = (e) => {
    e.preventDefault();
    sendOTP();
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!otp) {
      toast.error('Please enter the OTP');
      return;
    }

    setLoading(true);
    try {
      const response = await window.api.auth.verifyOTP(email, otp);
      if (response.success) {
        localStorage.setItem('slj_authenticated', 'true');
        toast.success('Login successful!');
        navigate('/pos');
      } else {
        toast.error(response.message || 'Invalid OTP. Please try again.');
      }
    } catch (error) {
      toast.error('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card glass-morphism">
        <div className="auth-header">
          <div className="logo-container">
            <span className="logo-text">SLJ</span>
          </div>
          <h2>Welcome Back</h2>
          <p>Login to Sri Lakshmi Jewellers</p>
        </div>

        {step === 1 ? (
          <form className="auth-form" onSubmit={handleSendOTP}>
            <div className="form-group">
              <label htmlFor="email">Email Address</label>
              <input
                type="email"
                id="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <button type="submit" className="auth-btn" disabled={loading}>
              {loading ? 'Sending...' : 'Send OTP'}
            </button>
            <div className="auth-footer">
              Don't have an account? <Link to="/register">Register</Link>
            </div>
          </form>
        ) : (
          <form className="auth-form" onSubmit={handleLogin}>
            <div className="form-group">
              <label htmlFor="otp">Enter Verification Code</label>
              <div className="otp-input-container">
                <input
                  type="text"
                  id="otp"
                  maxLength="6"
                  placeholder="6-digit OTP"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  className="otp-input"
                  required
                />
              </div>
              <p className="resend-text">
                Didn't receive it? <span onClick={sendOTP} className="resend-link">Resend</span>
              </p>
            </div>
            <button type="submit" className="auth-btn" disabled={loading}>
              {loading ? 'Verifying...' : 'Login'}
            </button>
            <button type="button" className="back-btn" onClick={() => setStep(1)}>
              Back to Email
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default LoginPage;
