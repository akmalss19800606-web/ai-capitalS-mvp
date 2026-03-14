p='/app/app/db/models/organization_models.py'
t=open(p).read()
old='mode = Column(Enum(OrgMode), default=OrgMode.SOLO, nullable=False)'
new='mode = Column(String(20), default="solo", nullable=False)'
t=t.replace(old, new)
open(p,'w').write(t)
print('DONE')
print([l.strip() for l in open(p).readlines() if 'mode' in l.lower() and 'Column' in l])
