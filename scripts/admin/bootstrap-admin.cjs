/* Read one JSON line from stdin: {email,password,name?}. Never pass credentials as CLI args. */
const { loadEnvConfig } = require('@next/env');
const { PrismaClient } = require('@prisma/client');
const { hash } = require('bcryptjs');
loadEnvConfig(process.cwd());
const db = new PrismaClient();
process.stdin.setEncoding('utf8');
if (process.stdin.isTTY) process.stdin.setRawMode(true);
process.stdin.resume();
let input = '';
process.stdin.on('data', async chunk => {
  input += chunk;
  if (!input.includes('\n')) return;
  process.stdin.removeAllListeners('data');
  try {
    const {email,password,name='관리자'} = JSON.parse(input.trim());
    input = '';
    if (typeof email !== 'string' || typeof password !== 'string' || Buffer.byteLength(password) > 72 || password.length < 8) throw new Error('Invalid input');
    const matches = await db.user.findMany({where:{email:{equals:email,mode:'insensitive'}},select:{id:true,deletedAt:true}});
    if (matches.length > 1 || matches[0]?.deletedAt) throw new Error('Account needs manual review');
    const passwordHash = await hash(password,12);
    const user = await db.$transaction(async tx => {
      const data = {passwordHash,isAdmin:true,role:'director',approvalStatus:'approved',disabledMenus:[]};
      const account = matches[0]
        ? await tx.user.update({where:{id:matches[0].id},data})
        : await tx.user.create({data:{...data,email:email.toLowerCase(),name}});
      await tx.accountAuditLog.create({data:{userId:account.id,actorId:account.id,action:'account.admin_bootstrap',outcome:'success',details:{created:!matches.length}}});
      return account;
    });
    console.log(JSON.stringify({id:user.id,isAdmin:user.isAdmin,approvalStatus:user.approvalStatus,created:!matches.length}));
  } catch { console.error('Administrator setup failed; no credentials were logged.'); process.exitCode=1; }
  finally { await db.$disconnect(); process.stdin.destroy(); }
});
