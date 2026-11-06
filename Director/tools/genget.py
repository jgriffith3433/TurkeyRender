"""Download a Hawkes Gen library asset: genget.py <asset id> <file>"""
import json, os, sys, urllib.request
c = json.load(open(os.path.expanduser("~/.hawkes/client.json")))
url = c["genUrl"].rstrip("/") + "/v1/library/" + sys.argv[1] + "/file"
r = urllib.request.Request(url, headers={"Authorization": "Bearer " + c["genKey"]})
open(sys.argv[2], "wb").write(urllib.request.urlopen(r, timeout=120).read())
print("saved", sys.argv[2], os.path.getsize(sys.argv[2]))
