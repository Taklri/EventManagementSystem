import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import bgImage from '../assets/bgimage.png';
import nuLogo from '../assets/NULOGO.svg';
import eyeIcon from '../assets/eye.svg';
import eyeOffIcon from '../assets/eye-off.svg';


const labelStyle = {
  display: 'block',
  fontSize: '14px',
  fontWeight: '500',
  marginBottom: '8px',
};

const spacedLabelStyle = {
  display: 'block',
  fontSize: '14px',
  fontWeight: '500',
  margin: '20px 0 8px',
};


const starStyle = {
  color: '#dc2626',
};

const inputStyle = {
  width: '100%',
  height: '40px',
  padding: '0 14px',
  fontSize: '14px',
  border: '1px solid #e5e7eb',
  borderRadius: '10px',
  boxSizing: 'border-box',
};

// password 
const passwordInputStyle = {
  width: '100%',
  height: '40px',
  padding: '0 48px 0 14px',
  fontSize: '14px',
  border: '1px solid #e5e7eb',
  borderRadius: '10px',
  boxSizing: 'border-box',
};

const hintStyle = {
  margin: '8px 0 0',
  fontSize: '12px',
  color: '#6b7280',
};

// the eye button inside the password box
const showButtonStyle = {
  position: 'absolute',
  top: 0,
  bottom: 0,
  right: '14px',
  padding: 0,
  border: 'none',
  background: 'none',
  display: 'flex',
  alignItems: 'center',
  cursor: 'pointer',
};

const eyeStyle = {
  width: '20px',
  height: '20px',
};

function RegisterPage() {
  const navigate = useNavigate();

  // USER INPUTS
  const [studentId, setStudentId] = useState('');
  const [firstName, setFirstName] = useState('');
  const [middleName, setMiddleName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rePassword, setRePassword] = useState('');

  // SHOW OR HIDE
  const [showPass, setShowPass] = useState(false);
  const [showRePass, setShowRePass] = useState(false);

  // HOVERS
  const [hoverCreate, setHoverCreate] = useState(false);
  const [hoverLogin, setHoverLogin] = useState(false);

  const handleSubmit = (event) => {
    event.preventDefault();


    if (password !== rePassword) {
      alert('Passwords do not match.');
      return;
    }

    console.log(studentId, firstName, middleName, lastName, email, password);

    
    navigate('/');
  };


  // eye icon when hidden, eye-off icon when visible
  let passType = 'password';
  let passIcon = eyeIcon;
  if (showPass === true) {
    passType = 'text';
    passIcon = eyeOffIcon;
  }

  let rePassType = 'password';
  let rePassIcon = eyeIcon;
  if (showRePass === true) {
    rePassType = 'text';
    rePassIcon = eyeOffIcon;
  }

  
  let createBg = '#1f3a6b';
  let createColor = 'white';
  if (hoverCreate === true) {
    createBg = '#f5b800';
    createColor = '#1b2f5a';
  }

 
  let loginColor = '#1b2f5a';
  if (hoverLogin === true) {
    loginColor = '#d9a000';
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
          height: '850px',
          marginRight: '60px',
          backgroundColor: 'white',
          borderRadius: '18px',
          padding: '32px 40px 26px',
          boxSizing: 'border-box',
        }}
      >
       
        <div style={{ textAlign: 'center' }}>
          <img src={nuLogo} alt="NU Logo" style={{ width: '76px' }} />
          <p style={{ margin: '6px 0 0', fontSize: '12px', color: '#1f3a6b' }}>National University</p>
          <h2 style={{ margin: '14px 0 4px', fontSize: '30px', color: '#1b2f5a' }}>Create your account</h2>
          <p style={{ margin: 0, fontSize: '14px', color: '#6b7280' }}>
            Register with your student details to access MyNU.
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ marginTop: '28px' }}>
          <label style={labelStyle}>
            Student ID <span style={starStyle}>*</span>
          </label>
          <input
            type="number"
            placeholder="2026-123456"
            value={studentId}
            onChange={(event) => setStudentId(event.target.value)}
            style={inputStyle}
            required
          />
          <p style={hintStyle}>Found on your NU ID or enrollment form.</p>

          
          <div style={{ display: 'flex', gap: '14px', marginTop: '20px' }}>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>
                First name <span style={starStyle}>*</span>
              </label>
              <input
                type="text"
                value={firstName}
                onChange={(event) => setFirstName(event.target.value)}
                style={inputStyle}
                required
              />
            </div>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>
                Middle name <span style={{ fontSize: '10px', color: '#6b7280' }}>(optional)</span>
              </label>
              <input
                type="text"
                value={middleName}
                onChange={(event) => setMiddleName(event.target.value)}
                style={inputStyle}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>
                Last name <span style={starStyle}>*</span>
              </label>
              <input
                type="text"
                value={lastName}
                onChange={(event) => setLastName(event.target.value)}
                style={inputStyle}
                required
              />
            </div>
          </div>

          <label style={spacedLabelStyle}>
            Email <span style={starStyle}>*</span>
          </label>
          <input
            type="email"
            placeholder="name@students.nu-moa.edu.ph"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            style={inputStyle}
            required
          />

          <label style={spacedLabelStyle}>
            Password <span style={starStyle}>*</span>
          </label>
          <div style={{ position: 'relative' }}>
            <input
              type={passType}
              placeholder="Create a password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              minLength={8}
              style={passwordInputStyle}
              required
            />
            <button type="button" onClick={() => setShowPass(!showPass)} style={showButtonStyle}>
              <img src={passIcon} alt="Show or hide password" style={eyeStyle} />
            </button>
          </div>
          <p style={hintStyle}>At least 8 characters.</p>

          <label style={spacedLabelStyle}>
            Re-Password <span style={starStyle}>*</span>
          </label>
          <div style={{ position: 'relative' }}>
            <input
              type={rePassType}
              placeholder="Re-enter your password"
              value={rePassword}
              onChange={(event) => setRePassword(event.target.value)}
              style={passwordInputStyle}
              required
            />
            <button type="button" onClick={() => setShowRePass(!showRePass)} style={showButtonStyle}>
              <img src={rePassIcon} alt="Show or hide password" style={eyeStyle} />
            </button>
          </div>

          <button
            type="submit"
            onMouseEnter={() => setHoverCreate(true)}
            onMouseLeave={() => setHoverCreate(false)}
            style={{
              width: '100%',
              height: '46px',
              marginTop: '26px',
              border: 'none',
              borderRadius: '10px',
              fontSize: '16px',
              fontWeight: 'bold',
              cursor: 'pointer',
              color: createColor,
              backgroundColor: createBg,
            }}
          >
            Create Account
          </button>
        </form>

        
        <p style={{ margin: '16px 0 0', textAlign: 'center', fontSize: '14px', color: '#4b5563' }}>
          Already have an account?{' '}
          <Link
            to="/"
            onMouseEnter={() => setHoverLogin(true)}
            onMouseLeave={() => setHoverLogin(false)}
            style={{ fontWeight: 'bold', textDecoration: 'none', color: loginColor }}
          >
            Log In
          </Link>
        </p>
      </div>
    </div>
  );
}

export default RegisterPage;