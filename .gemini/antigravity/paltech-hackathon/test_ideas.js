async function run() {
  const loginRes = await fetch('http://localhost:3000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'reviewer@example.com', password: 'reviewer123' })
  });
  const cookie = loginRes.headers.get('set-cookie');
  console.log('Cookie:', cookie);
  
  const ideasRes = await fetch('http://localhost:3000/api/ideas', {
    headers: { 'Cookie': cookie }
  });
  const json = await ideasRes.json();
  console.log('Response:', json);
}
run();
