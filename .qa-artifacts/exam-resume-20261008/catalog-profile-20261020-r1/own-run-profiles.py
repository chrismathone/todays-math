from pathlib import Path
import subprocess,os,sys
P=Path(__file__).resolve().parent;R=Path('C:/Users/user/orca/workspaces/todays-math/exam-extraction-resume-20261008');env=dict(os.environ,TSX_DISABLE_CACHE='1',DATABASE_URL='postgresql://profile:profile@localhost:1/profile',DIRECT_URL='postgresql://profile:profile@localhost:1/profile')
O=P/'own-replay-output';O.mkdir(exist_ok=False) # Never overwrite the sealed measured run.
for script,out,mode in [('own-profile.ts','own-cold1.json','cold'),('own-profile.ts','own-phases.json','phases'),('own-cpu-profile.ts','own-cold-cpu.json','cold'),('own-dynamic-controls.ts','own-dynamic-results.json',None),('own-lookup-prototype.ts','own-lookup-results.json',None)]:
 cmd=['node',str(R/'node_modules/tsx/dist/cli.mjs'),'--tsconfig',str(R/'tsconfig.json'),str(P/script),str(O/out)]+([mode]if mode else []);subprocess.run(cmd,cwd=R,env=env,check=True,timeout=90)

subprocess.run([sys.executable,'-B',str(P/'own-cpu-summary.py'),str(O)],check=True)
