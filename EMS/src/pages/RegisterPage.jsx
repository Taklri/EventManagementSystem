import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import bgImage from '../assets/bgimage.png';
import nuLogo from '../assets/NULOGO.svg';
import eyeIcon from '../assets/eye.svg';
import eyeOffIcon from '../assets/eye-off.svg';

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

  const handleSubmit = (event) => {
    event.preventDefault();

    if (password !== rePassword) {
      alert('Passwords do not match.');
      return;
    }
    console.log(studentId, firstName, middleName, lastName, email, password);

    navigate('/');
  };


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

  return (
    <div
      className="min-h-screen flex items-center justify-between px-[7vw] py-5 font-sans bg-cover bg-center"
      style={{
        backgroundImage:
          'linear-gradient(rgba(27, 71, 153, 0.47), rgba(250, 252, 255, 0.36)), url(' + bgImage + ')',
      }}
    >
      {/*title text*/}
      <div className="self-end mb-10 text-white">
        <p className="mb-1.5 text-sm text-nu-gold">National University</p>
        <h1 className="text-7xl font-extrabold leading-[1.05]">
          Event <br /> Management
        </h1>
        <div className="h-1 mt-[18px] bg-nu-gold"></div>
      </div>


      <div className="w-[550px] h-[850px] mr-[60px] px-10 pt-8 pb-[26px] bg-white rounded-[18px]">
        <div className="text-center">
          <img src={nuLogo} alt="NU Logo" className="w-[76px] mx-auto" />
          <p className="mt-1.5 text-xs text-nu-navy">National University</p>
          <h2 className="mt-3.5 mb-1 text-[30px] font-bold text-nu-dark">Create your account</h2>
          <p className="text-sm text-gray-500">Register with your student details to access MyNU.</p>
        </div>

        {/*form*/}
        <form onSubmit={handleSubmit} className="mt-7">
          <label className="block mb-2 text-sm font-medium">
            Student ID <span className="text-red-600">*</span>
          </label>
          <input
            type="number"
            placeholder="2026-123456"
            value={studentId}
            onChange={(event) => setStudentId(event.target.value)}
            className="w-full h-10 px-3.5 text-sm border border-gray-200 rounded-[10px] outline-none focus:border-nu-navy"
            required
          />
          <p className="mt-2 text-xs text-gray-500">Found on your NU ID or enrollment form.</p>

          {/*first, middle and last name side by side*/}
          <div className="flex gap-3.5 mt-5">
            <div className="flex-1">
              <label className="block mb-2 text-sm font-medium">
                First name <span className="text-red-600">*</span>
              </label>
              <input
                type="text"
                value={firstName}
                onChange={(event) => setFirstName(event.target.value)}
                className="w-full h-10 px-3.5 text-sm border border-gray-200 rounded-[10px] outline-none focus:border-nu-navy"
                required
              />
            </div>
            <div className="flex-1">
              <label className="block mb-2 text-sm font-medium">
                Middle name <span className="text-[10px] text-gray-500">(optional)</span>
              </label>
              <input
                type="text"
                value={middleName}
                onChange={(event) => setMiddleName(event.target.value)}
                className="w-full h-10 px-3.5 text-sm border border-gray-200 rounded-[10px] outline-none focus:border-nu-navy"
              />
            </div>
            <div className="flex-1">
              <label className="block mb-2 text-sm font-medium">
                Last name <span className="text-red-600">*</span>
              </label>
              <input
                type="text"
                value={lastName}
                onChange={(event) => setLastName(event.target.value)}
                className="w-full h-10 px-3.5 text-sm border border-gray-200 rounded-[10px] outline-none focus:border-nu-navy"
                required
              />
            </div>
          </div>

          <label className="block mt-5 mb-2 text-sm font-medium">
            Email <span className="text-red-600">*</span>
          </label>
          <input
            type="email"
            placeholder="name@students.nu-moa.edu.ph"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="w-full h-10 px-3.5 text-sm border border-gray-200 rounded-[10px] outline-none focus:border-nu-navy"
            required
          />

          <label className="block mt-5 mb-2 text-sm font-medium">
            Password <span className="text-red-600">*</span>
          </label>
          <div className="relative">
            <input
              type={passType}
              placeholder="Create a password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              minLength={8}
              className="w-full h-10 pl-3.5 pr-12 text-sm border border-gray-200 rounded-[10px] outline-none focus:border-nu-navy"
              required
            />
            <button
              type="button"
              onClick={() => setShowPass(!showPass)}
              className="absolute inset-y-0 right-3.5 flex items-center cursor-pointer"
            >
              <img src={passIcon} alt="Show or hide password" className="w-5 h-5" />
            </button>
          </div>
          <p className="mt-2 text-xs text-gray-500">At least 8 characters.</p>

          <label className="block mt-5 mb-2 text-sm font-medium">
            Re-Password <span className="text-red-600">*</span>
          </label>
          <div className="relative">
            <input
              type={rePassType}
              placeholder="Re-enter your password"
              value={rePassword}
              onChange={(event) => setRePassword(event.target.value)}
              className="w-full h-10 pl-3.5 pr-12 text-sm border border-gray-200 rounded-[10px] outline-none focus:border-nu-navy"
              required
            />
            <button
              type="button"
              onClick={() => setShowRePass(!showRePass)}
              className="absolute inset-y-0 right-3.5 flex items-center cursor-pointer"
            >
              <img src={rePassIcon} alt="Show or hide password" className="w-5 h-5" />
            </button>
          </div>

          
          <button
            type="submit"
            className="w-full h-[46px] mt-[26px] text-base font-bold text-white bg-nu-navy rounded-[10px] cursor-pointer hover:bg-nu-gold hover:text-nu-dark"
          >
            Create Account
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-gray-600">
          Already have an account?{' '}
          <Link to="/" className="font-bold text-nu-dark hover:text-nu-gold-dark">
            Log In
          </Link>
        </p>
      </div>
    </div>
  );
}

export default RegisterPage;