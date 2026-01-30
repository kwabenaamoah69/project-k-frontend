import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

function Login() {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch('http://localhost:5000/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, password }),
      });
      const data = await response.json();
      if (response.ok) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        navigate('/dashboard');
      } else {
        alert("Error: " + data.error);
      }
    } catch (error) { console.error(error); alert("Server Error"); }
  };

  return (
    <div style={{textAlign:'center', padding:'20px', maxWidth:'300px'}}>
      <h2 style={{color:'var(--gold)'}}>LOGIN</h2>
      <form onSubmit={handleLogin} style={{display:'flex', flexDirection:'column', gap:'15px'}}>
        <input type="tel" placeholder="Phone" value={phone} onChange={e=>setPhone(e.target.value)} style={{padding:'10px'}} />
        <input type="password" placeholder="Password" value={password} onChange={e=>setPassword(e.target.value)} style={{padding:'10px'}} />
        <button type="submit" style={{padding:'10px', background:'var(--gold)'}}>ENTER</button>
      </form>
      <p onClick={()=>navigate('/register')} style={{color:'var(--text-muted)', cursor:'pointer'}}>Create Account</p>
    </div>
  );
}
export default Login;