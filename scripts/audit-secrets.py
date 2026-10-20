import pathlib,re,subprocess,zipfile,json,sys
root=pathlib.Path.cwd(); patterns={
 'openai_secret':rb'\bsk-(?:proj-|svcacct-)?[A-Za-z0-9_-]{20,}',
 'sites_write_secret':rb'\bart_v2_[A-Za-z0-9_-]{10,}',
 'github_secret':rb'\b(?:ghp_|github_pat_)[A-Za-z0-9_]{20,}',
 'private_key':rb'-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----',
 'aws_access_key':rb'\bAKIA[0-9A-Z]{16}\b'}
if '--package' in sys.argv:
 folders=['app','db','drizzle','scripts','worker','vendor','.openai','contracts','public']; files=['package.json','package-lock.json','tsconfig.json','vite.config.ts','drizzle.config.ts','cloudflare-env.d.ts','README.md','SUBMISSION.md','.gitignore']
 target=root/'public/source/plan-do-see-source.zip'
 with zipfile.ZipFile(target,'w',zipfile.ZIP_DEFLATED,strict_timestamps=False) as z:
  for folder in folders:
   for f in sorted((root/folder).rglob('*')):
    if f.is_file() and f.suffix!='.zip' and '__pycache__' not in f.parts:z.write(f,f.relative_to(root).as_posix())
  for file in files:
   if (root/file).is_file():z.write(root/file,file)
issues=[];checked={'working_files':0,'build_files':0,'git_blobs':0,'zip_files':0}
def scan(data,label):
 for name,pattern in patterns.items():
  if re.search(pattern,data):issues.append({'location':label,'pattern':name})
for folder in ['app','lib','worker','db','drizzle','contracts','docs','.openai','scripts','public','dist']:
 for f in (root/folder).rglob('*'):
  if f.is_file() and f.suffix!='.zip':
   checked['build_files' if folder=='dist' else 'working_files']+=1;scan(f.read_bytes(),str(f.relative_to(root)))
for f in ['README.md','SUBMISSION.md','package.json','vite.config.ts']:
 scan((root/f).read_bytes(),f)
for f in (root/'public/source').glob('*.zip'):
 with zipfile.ZipFile(f) as z:
  for info in z.infolist():
   if not info.is_dir():checked['zip_files']+=1;scan(z.read(info),f'zip:{info.filename}')
git='C:/Users/User/.cache/codex-runtimes/codex-primary-runtime/dependencies/native/git/cmd/git.exe'
objects=subprocess.check_output([git,'rev-list','--objects','--all'],cwd=root,text=True).splitlines()
for item in objects:
 sha=item.split(' ',1)[0]
 if subprocess.check_output([git,'cat-file','-t',sha],cwd=root,text=True).strip()=='blob':checked['git_blobs']+=1;scan(subprocess.check_output([git,'cat-file','blob',sha],cwd=root),'git:'+item)
report={'result':'PASS' if not issues else 'FAIL','scope':'source, build, source ZIP, all reachable Git blobs; common secret prefixes and private-key headers','checked':checked,'issues':issues,'limits':'Pattern scan; not proof against arbitrary unknown credential formats. HTTP and browser console are checked separately.'}
(root/'outputs/evidence/card5').mkdir(parents=True,exist_ok=True);(root/'outputs/evidence/card5/secret-scan.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8');print(json.dumps(report,ensure_ascii=False));sys.exit(bool(issues))

