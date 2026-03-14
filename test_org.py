import urllib.request,json
data=json.dumps({"name":"test_org","mode":"branch"}).encode()
req=urllib.request.Request("http://localhost:8000/api/v1/organizations",data=data,headers={"Content-Type":"application/json"})
try:
    resp=urllib.request.urlopen(req)
    print("SUCCESS:",resp.read().decode()[:200])
except Exception as e:
    print("ERROR:",e)
    if hasattr(e,"read"): print(e.read().decode()[:300])
