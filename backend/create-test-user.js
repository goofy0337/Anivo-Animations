import sqlite3 from 'sqlite3';
import bcrypt from 'bcryptjs';

const db = new sqlite3.Database('./users.db', async (err) => {
  if (err) {
    console.error('Database error:', err.message);
    process.exit(1);
  }
  
  console.log('Connected to database');
  
  const username = 'TestUser1';
  const email = 'testuser1@test.com';
  const password = 'Testing123';
  
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    
    db.run('INSERT INTO users (username, email, password) VALUES (?, ?, ?)',
      [username, email, hashedPassword],
      function(err) {
        if (err) {
          console.error('Error creating user:', err.message);
          if (err.message.includes('UNIQUE constraint failed')) {
            console.log('Test user already exists!');
          }
        } else {
          console.log(`✓ Test user created successfully!`);
          console.log(`  Username: ${username}`);
          console.log(`  Email: ${email}`);
          console.log(`  Password: ${password}`);
        }
        
        db.close();
        process.exit(0);
      });
  } catch (error) {
    console.error('Error:', error.message);
    db.close();
    process.exit(1);
  }
});
