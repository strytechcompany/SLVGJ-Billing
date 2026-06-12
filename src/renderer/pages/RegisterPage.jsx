import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import '../styles/auth.css';

const RegisterPage = () => {
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState(1); // 1: Email, 2: OTP
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const sendRegistrationOTP = async () => {
    if (!email) {
      toast.error('Email is required');
      return;
    }
    setLoading(true);
    try {
      const res = await window.api.auth.register(email);
      if (res.success) {
        const response = await window.api.auth.sendOTP(email);
        if (response.success) {
          setStep(2);
          toast.success('Verification code sent to your email');
        } else {
          toast.error(response.message || 'Failed to send OTP');
        }
      } else {
        toast.error(res.message || 'User already exists. Please log in.');
      }
    } catch (error) {
      toast.error('An error occurred during registration.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = (e) => {
    e.preventDefault();
    sendRegistrationOTP();
  };

  const handleVerify = async (e) => {
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
        toast.success('Registration successful! Logging you in...');
        navigate('/pos');
      } else {
        toast.error(response.message || 'Invalid verification code');
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
          <h2>Create Account</h2>
          <p>Join Sri Lakshmi Jewellers Billing System</p>
        </div>

        {step === 1 ? (
          <form className="auth-form" onSubmit={handleRegister}>
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
              {loading ? 'Processing...' : 'Register'}
            </button>
            <div className="auth-footer">
              Already have an account? <Link to="/">Login</Link>
            </div>
          </form>
        ) : (
          <form className="auth-form" onSubmit={handleVerify}>
            <div className="form-group">
              <label htmlFor="otp">Verify Your Email</label>
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
                Code sent to {email}. <span onClick={sendRegistrationOTP} className="resend-link">Resend</span>
              </p>
            </div>
            <button type="submit" className="auth-btn" disabled={loading}>
              {loading ? 'Verifying...' : 'Complete Registration'}
            </button>
            <button type="button" className="back-btn" onClick={() => setStep(1)}>
              Change Email
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default RegisterPage;
