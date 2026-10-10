import { useState } from 'react';
import { Link } from 'react-router-dom';
import bgImage from '../assets/bgimage.png';
import nuLogo from '../assets/NULOGO.svg';
import eyeIcon from '../assets/eye.svg';
import eyeOffIcon from '../assets/eye-off.svg';

function LoginPage() {
 // USER INPUTS
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const handleSubmit = (event) => {
    event.preventDefault();
    console.log(email, password);
  };

  // SHOW OR HIDE
  let passType = 'password';
  let passIcon = eyeIcon;
  if (showPass === true) {
    passType = 'text';
    passIcon = eyeOffIcon;
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


      <div className="w-[550px] h-[750px] mr-[60px] px-10 pt-9 pb-7 flex flex-col bg-white rounded-[18px]">
        <div className="text-center">
          <img src={nuLogo} alt="NU Logo" className="w-[90px] mx-auto" />
          <p className="mt-1.5 text-[13px] text-nu-navy">National University</p>
          <h2 className="mt-[18px] mb-1 text-[34px] font-bold text-nu-dark">Login</h2>
          <p className="text-[15px] text-gray-500">Please enter your credentials to access MyNU.</p>
        </div>

        {/* form */}
        <form onSubmit={handleSubmit} className="mt-14">
          <label className="block mb-3 text-[15px] font-medium">Email</label>
          <input
            type="email"
            placeholder="name@students.nu-moa.edu.ph"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="w-full h-12 px-4 text-[15px] border border-gray-200 rounded-[10px] outline-none focus:border-nu-navy"
            required
          />

          <label className="block mt-9 mb-3 text-[15px] font-medium">Password</label>
          <div className="relative">
            <input
              type={passType}
              placeholder="Enter password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full h-12 pl-4 pr-[52px] text-[15px] border border-gray-200 rounded-[10px] outline-none focus:border-nu-navy"
              required
            />
            <button
              type="button"
              onClick={() => setShowPass(!showPass)}
              className="absolute inset-y-0 right-4 flex items-center cursor-pointer"
            >
              <img src={passIcon} alt="Show or hide password" className="w-[22px] h-[22px]" />
            </button>
          </div>

          <div className="mt-3.5 text-right">
            <Link
              to="/forgot-password"
              className="text-sm font-bold text-[#6b7a99] hover:text-nu-gold-dark"
            >
              Forgot Password?
            </Link>
          </div>

          <button
            type="submit"
            className="w-full h-[50px] mt-8 text-base font-bold text-white bg-nu-navy rounded-[10px] cursor-pointer hover:bg-nu-gold hover:text-nu-dark"
          >
            Login Account
          </button>
        </form>

        <p className="mt-auto text-center text-sm text-gray-600">
          Don't have an account?{' '}
          <Link to="/register" className="font-bold text-nu-dark hover:text-nu-gold-dark">
            Sign Up
          </Link>
        </p>
      </div>
    </div>
  );
}

export default LoginPage;