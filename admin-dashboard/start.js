const { spawn } = require('child_process');

// Set the port from environment variable or default to 3000
const port = process.env.PORT || 3000;
process.env.PORT = port;

console.log(`Starting Next.js server on port ${port}...`);

// Start the Next.js server
const server = spawn('node', ['server.js'], {
  stdio: 'inherit',
  env: { ...process.env, PORT: port }
});

server.on('error', (error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});

server.on('close', (code) => {
  console.log(`Server process exited with code ${code}`);
  process.exit(code);
});