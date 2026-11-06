from pathlib import Path
import hashlib,json,zipfile,datetime
root=Path(__file__).resolve().parents[1]
base=root.parent
skip={'node_modules','.git','dist','release','verification'}
files=[p for p in sorted(root.rglob('*')) if p.is_file() and not any(part in skip for part in p.relative_to(root).parts) and p.name!='SOURCE-MANIFEST.json']
manifest={'createdAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'files':[{'path':str(p.relative_to(root)),'bytes':p.stat().st_size,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()} for p in files]}
(root/'SOURCE-MANIFEST.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
files.append(root/'SOURCE-MANIFEST.json')
with zipfile.ZipFile(base/'uchi-timeline-source.zip','w',zipfile.ZIP_DEFLATED) as archive:
 for p in files:archive.write(p,Path('uchi-timeline')/p.relative_to(root))
 if (base/'DELIVERY.md').exists():archive.write(base/'DELIVERY.md','DELIVERY.md')
with zipfile.ZipFile(base/'uchi-timeline-verification.zip','w',zipfile.ZIP_DEFLATED) as archive:
 for folder in ['verification','docs/results']:
  for p in sorted((root/folder).rglob('*')):
   if p.is_file():archive.write(p,p.relative_to(root))
print(json.dumps({'source_files':len(files),'source_zip_bytes':(base/'uchi-timeline-source.zip').stat().st_size,'verification_zip_bytes':(base/'uchi-timeline-verification.zip').stat().st_size}))
