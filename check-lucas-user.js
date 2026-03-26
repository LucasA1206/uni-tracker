const { PrismaClient } = require('@prisma/client');  
const p = new PrismaClient();  
p.user.findUnique({ where: { username: 'LucasA001' } }).then(function(user) {  
  console.log('LucasA001 in DB:', Boolean(user));  
  if (user) console.log(JSON.stringify({ id: user.id, username: user.username, email: user.universityEmail, role: user.role }));  
});  
