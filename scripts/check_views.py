import sys
import paramiko
import json
import os

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect("46.250.226.213", 22, "root", "vo4Yt5#sO8grIkht", timeout=15)

mongo_cmd = """
mongosh 'mongodb://nhan_conan:NhanConan2026%40AnimeVip@127.0.0.1:27017/captainmedia?authSource=admin' --quiet --eval '
  const total = db.kkphim.countDocuments();
  const withView = db.kkphim.countDocuments({ view: { $gt: 0 } });
  const topViews = db.kkphim.find({ view: { $exists: true } }).sort({ view: -1 }).limit(10).map(m => ({ name: m.name, view: m.view, slug: m.slug, type: m.type })).toArray();
  const topTmdb = db.kkphim.find({ "tmdb.vote_average": { $gt: 0 } }).sort({ "tmdb.vote_average": -1 }).limit(10).map(m => ({ name: m.name, vote: m.tmdb.vote_average, count: m.tmdb.vote_count })).toArray();
  print(JSON.stringify({ total, withView, topViews, topTmdb }, null, 2));
'
"""

stdin, stdout, stderr = ssh.exec_command(mongo_cmd, timeout=30)
out = stdout.read().decode('utf-8')
ssh.close()
print(out)
