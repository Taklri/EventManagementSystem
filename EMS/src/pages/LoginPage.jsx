import { useState } from 'react';
import { Link } from 'react-router-dom';
import bgImage from '../assets/bgimage.png';
import nuLogo from '../assets/NULOGO.svg';
import eyeIcon from '../assets/eye.svg';
import eyeOffIcon from '../assets/eye-off.svg';

// styles that are used more than once
const labelStyle = {
  display: 'block',
  fontSize: '15px',
  fontWeight: '500',
  marginBottom: '12px',
};

const inputStyle = {
  width: '100%',
  height: '48px',
  padding: '0 16px',
  fontSize: '15px',
  border: '1px solid #e5e7eb',
  borderRadius: '10px',
  boxSizing: 'border-box',
};

// password box needs extra space on the right for the Show/Hide button
const passwordInputStyle = {
  width: '100%',
  height: '48px',
  padding: '0 52px 0 16px',
  fontSize: '15px',
  border: '1px solid #e5e7eb',
  borderRadius: '10px',
  boxSizing: 'border-box',
};

const showButtonStyle = {
  position: 'absolute',
  top: 0,
  bottom: 0,
  right: '16px',
  padding: 0,
  border: 'none',
  background: 'none',
  display: 'flex',
  alignItems: 'center',
  cursor: 'pointer',
};

const eyeStyle = {
  width: '22px',
  height: '22px',
};

function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');


  const [showPass, setShowPass] = useState(false);


  const [hoverLogin, setHoverLogin] = useState(false);
  const [hoverForgot, setHoverForgot] = useState(false);
  const [hoverSignUp, setHoverSignUp] = useState(false);

  const handleSubmit = (event) => {
    event.preventDefault();
    console.log(email, password);
  };


  let passType = 'password';
  let passIcon = eyeIcon;
  if (showPass === true) {
    passType = 'text';
    passIcon = eyeOffIcon;
  }


  let loginBg = '#1f3a6b';
  let loginColor = 'white';
  if (hoverLogin === true) {
    loginBg = '#f5b800';
    loginColor = '#1b2f5a';
  }


  let forgotColor = '#6b7a99';
  if (hoverForgot === true) {
    forgotColor = '#d9a000';
  }

  let signUpColor = '#1b2f5a';
  if (hoverSignUp === true) {
    signUpColor = '#d9a000';
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '20px 7vw',
        boxSizing: 'border-box',
        fontFamily: 'Inter, sans-serif',
        backgroundImage:
          'linear-gradient(rgba(27, 71, 153, 0.47), rgba(250, 252, 255, 0.36)), url(' + bgImage + ')',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      <div style={{ alignSelf: 'flex-end', marginBottom: '40px', color: 'white' }}>
        <p style={{ color: '#f5b800', margin: '0 0 6px', fontSize: '14px' }}>National University</p>
        <h1 style={{ margin: 0, fontSize: '72px', lineHeight: 1.05, fontWeight: '800' }}>
          Event <br /> Management
        </h1>
        <div style={{ height: '4px', backgroundColor: '#f5b800', marginTop: '18px' }}></div>
      </div>

    
      <div
        style={{
          width: '550px',
          height: '750px',
          marginRight: '60px',
          backgroundColor: 'white',
          borderRadius: '18px',
          padding: '36px 40px 28px',
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
       
        <div style={{ textAlign: 'center' }}>
          <img src={nuLogo} alt="NU Logo" style={{ width: '90px' }} />
          <p style={{ margin: '6px 0 0', fontSize: '13px', color: '#1f3a6b' }}>National University</p>
          <h2 style={{ margin: '18px 0 4px', fontSize: '34px', color: '#1b2f5a' }}>Login</h2>
          <p style={{ margin: 0, fontSize: '15px', color: '#6b7280' }}>
            Please enter your credentials to access MyNU.
          </p>
        </div>

        {/* form */}
        <form onSubmit={handleSubmit} style={{ marginTop: '56px' }}>
          <label style={labelStyle}>Email</label>
          <input
            type="email"
            placeholder="name@students.nu-moa.edu.ph"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            style={inputStyle}
            required
          />

          <label style={{ display: 'block', fontSize: '15px', fontWeight: '500', margin: '36px 0 12px' }}>
            Password
          </label>
          <div style={{ position: 'relative' }}>
            <input
              type={passType}
              placeholder="Enter password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              style={passwordInputStyle}
              required
            />
            <button type="button" onClick={() => setShowPass(!showPass)} style={showButtonStyle}>
              <img src={passIcon} alt="Show or hide password" style={eyeStyle} />
            </button>
          </div>

          <div style={{ textAlign: 'right', marginTop: '14px' }}>
            <Link
              to="/forgot-password"
              onMouseEnter={() => setHoverForgot(true)}
              onMouseLeave={() => setHoverForgot(false)}
              style={{ fontSize: '14px', fontWeight: 'bold', textDecoration: 'none', color: forgotColor }}
            >
              Forgot Password?
            </Link>
          </div>

          <button
            type="submit"
            onMouseEnter={() => setHoverLogin(true)}
            onMouseLeave={() => setHoverLogin(false)}
            style={{
              width: '100%',
              height: '50px',
              marginTop: '32px',
              border: 'none',
              borderRadius: '10px',
              fontSize: '16px',
              fontWeight: 'bold',
              cursor: 'pointer',
              color: loginColor,
              backgroundColor: loginBg,
            }}
          >
            Login Account
          </button>
        </form>

        
        <p style={{ margin: 'auto 0 0', textAlign: 'center', fontSize: '14px', color: '#4b5563' }}>
          Don't have an account?{' '}
          <Link
            to="/register"
            onMouseEnter={() => setHoverSignUp(true)}
            onMouseLeave={() => setHoverSignUp(false)}
            style={{ fontWeight: 'bold', textDecoration: 'none', color: signUpColor }}
          >
            Sign Up
          </Link>
        </p>
      </div>
    </div>
  );
}

export default LoginPage;