"use strict";exports.id=414,exports.ids=[414],exports.modules={1801:a=>{var b=Object.defineProperty,c=Object.getOwnPropertyDescriptor,d=Object.getOwnPropertyNames,e=Object.prototype.hasOwnProperty,f={};((a,c)=>{for(var d in c)b(a,d,{get:c[d],enumerable:!0})})(f,{Analytics:()=>j}),a.exports=((a,f,g,h)=>{if(f&&"object"==typeof f||"function"==typeof f)for(let g of d(f))e.call(a,g)||void 0===g||b(a,g,{get:()=>f[g],enumerable:!(h=c(f,g))||h.enumerable});return a})(b({},"__esModule",{value:!0}),f);var g=`
local key = KEYS[1]
local field = ARGV[1]

local data = redis.call("ZRANGE", key, 0, -1, "WITHSCORES")
local count = {}

for i = 1, #data, 2 do
  local json_str = data[i]
  local score = tonumber(data[i + 1])
  local obj = cjson.decode(json_str)

  local fieldValue = obj[field]

  if count[fieldValue] == nil then
    count[fieldValue] = score
  else
    count[fieldValue] = count[fieldValue] + score
  end
end

local result = {}
for k, v in pairs(count) do
  table.insert(result, {k, v})
end

return result
`,h=`
local prefix = KEYS[1]
local first_timestamp = tonumber(ARGV[1]) -- First timestamp to check
local increment = tonumber(ARGV[2])       -- Increment between each timestamp
local num_timestamps = tonumber(ARGV[3])  -- Number of timestampts to check (24 for a day and 24 * 7 for a week)
local num_elements = tonumber(ARGV[4])    -- Number of elements to fetch in each category
local check_at_most = tonumber(ARGV[5])   -- Number of elements to check at most.

local keys = {}
for i = 1, num_timestamps do
  local timestamp = first_timestamp - (i - 1) * increment
  table.insert(keys, prefix .. ":" .. timestamp)
end

-- get the union of the groups
local zunion_params = {"ZUNION", num_timestamps, unpack(keys)}
table.insert(zunion_params, "WITHSCORES")
local result = redis.call(unpack(zunion_params))

-- select num_elements many items
local true_group = {}
local false_group = {}
local denied_group = {}
local true_count = 0
local false_count = 0
local denied_count = 0
local i = #result - 1

-- index to stop at after going through "checkAtMost" many items:
local cutoff_index = #result - 2 * check_at_most

-- iterate over the results
while (true_count + false_count + denied_count) < (num_elements * 3) and 1 <= i and i >= cutoff_index do
  local score = tonumber(result[i + 1])
  if score > 0 then
    local element = result[i]
    if string.find(element, "success\\":true") and true_count < num_elements then
      table.insert(true_group, {score, element})
      true_count = true_count + 1
    elseif string.find(element, "success\\":false") and false_count < num_elements then
      table.insert(false_group, {score, element})
      false_count = false_count + 1
    elseif string.find(element, "success\\":\\"denied") and denied_count < num_elements then
      table.insert(denied_group, {score, element})
      denied_count = denied_count + 1
    end
  end
  i = i - 2
end

return {true_group, false_group, denied_group}
`,i=`
local prefix = KEYS[1]
local first_timestamp = tonumber(ARGV[1])
local increment = tonumber(ARGV[2])
local num_timestamps = tonumber(ARGV[3])

local keys = {}
for i = 1, num_timestamps do
  local timestamp = first_timestamp - (i - 1) * increment
  table.insert(keys, prefix .. ":" .. timestamp)
end

-- get the union of the groups
local zunion_params = {"ZUNION", num_timestamps, unpack(keys)}
table.insert(zunion_params, "WITHSCORES")
local result = redis.call(unpack(zunion_params))

return result
`,j=class{redis;prefix;bucketSize;constructor(a){this.redis=a.redis,this.prefix=a.prefix??"@upstash/analytics",this.bucketSize=this.parseWindow(a.window)}validateTableName(a){if(!/^[a-zA-Z0-9_-]+$/.test(a))throw Error(`Invalid table name: ${a}. Table names can only contain letters, numbers, dashes and underscores.`)}parseWindow(a){if("number"==typeof a){if(a<=0)throw Error(`Invalid window: ${a}`);return a}let b=/^(\d+)([smhd])$/;if(!b.test(a))throw Error(`Invalid window: ${a}`);let[,c,d]=a.match(b),e=parseInt(c);switch(d){case"s":return 1e3*e;case"m":return 1e3*e*60;case"h":return 1e3*e*3600;case"d":return 1e3*e*86400;default:throw Error(`Invalid window unit: ${d}`)}}getBucket(a){return Math.floor((a??Date.now())/this.bucketSize)*this.bucketSize}async ingest(a,...b){this.validateTableName(a),await Promise.all(b.map(async b=>{let c=this.getBucket(b.time),d=[this.prefix,a,c].join(":");await this.redis.zincrby(d,1,JSON.stringify({...b,time:void 0}))}))}formatBucketAggregate(a,b,c){let d={};return a.forEach(([a,c])=>{"success"==b&&(a=1===a?"true":null===a?"false":a),d[b]=d[b]||{},d[b][(a??"null").toString()]=c}),{time:c,...d}}async aggregateBucket(a,b,c){this.validateTableName(a);let d=this.getBucket(c),e=[this.prefix,a,d].join(":"),f=await this.redis.eval(g,[e],[b]);return this.formatBucketAggregate(f,b,d)}async aggregateBuckets(a,b,c,d){this.validateTableName(a);let e=this.getBucket(d),f=[];for(let d=0;d<c;d+=1)f.push(this.aggregateBucket(a,b,e)),e-=this.bucketSize;return Promise.all(f)}async aggregateBucketsWithPipeline(a,b,c,d,e){this.validateTableName(a),e=e??48;let f=this.getBucket(d),h=[],i=this.redis.pipeline(),j=[];for(let d=1;d<=c;d+=1){let k=[this.prefix,a,f].join(":");i.eval(g,[k],[b]),h.push(f),f-=this.bucketSize,(d%e==0||d==c)&&(j.push(i.exec()),i=this.redis.pipeline())}return(await Promise.all(j)).flat().map((a,c)=>this.formatBucketAggregate(a,b,h[c]))}async getAllowedBlocked(a,b,c){this.validateTableName(a);let d=[this.prefix,a].join(":"),e=this.getBucket(c),f=await this.redis.eval(i,[d],[e,this.bucketSize,b]),g={};for(let a=0;a<f.length;a+=2){let b=f[a],c=b.identifier,d=+f[a+1];g[c]||(g[c]={success:0,blocked:0}),g[c][b.success?"success":"blocked"]=d}return g}async getMostAllowedBlocked(a,b,c,d,e){this.validateTableName(a);let f=[this.prefix,a].join(":"),g=this.getBucket(d),[i,j,k]=await this.redis.eval(h,[f],[g,this.bucketSize,b,c,e??5*c]);return{allowed:this.toDicts(i),ratelimited:this.toDicts(j),denied:this.toDicts(k)}}toDicts(a){let b=[];for(let c=0;c<a.length;c+=1){let d=+a[c][0],e=a[c][1];b.push({identifier:e.identifier,count:d})}return b}}},2692:(a,b,c)=>{var d=Object.defineProperty,e=Object.getOwnPropertyDescriptor,f=Object.getOwnPropertyNames,g=Object.prototype.hasOwnProperty,h=(a,b)=>{for(var c in b)d(a,c,{get:b[c],enumerable:!0})},i={};h(i,{Analytics:()=>k,IpDenyList:()=>u,MultiRegionRatelimit:()=>D,Ratelimit:()=>E}),a.exports=((a,b,c,h)=>{if(b&&"object"==typeof b||"function"==typeof b)for(let c of f(b))g.call(a,c)||void 0===c||d(a,c,{get:()=>b[c],enumerable:!(h=e(b,c))||h.enumerable});return a})(d({},"__esModule",{value:!0}),i);var j=c(1801),k=class{analytics;table="events";constructor(a){this.analytics=new j.Analytics({redis:a.redis,window:"1h",prefix:a.prefix??"@upstash/ratelimit",retention:"90d"})}extractGeo(a){return void 0!==a.geo?a.geo:void 0!==a.cf?a.cf:{}}async record(a){await this.analytics.ingest(this.table,a)}async series(a,b){let c=Math.min((this.analytics.getBucket(Date.now())-this.analytics.getBucket(b))/36e5,256);return this.analytics.aggregateBucketsWithPipeline(this.table,a,c)}async getUsage(a=0){let b=Math.min((this.analytics.getBucket(Date.now())-this.analytics.getBucket(a))/36e5,256);return await this.analytics.getAllowedBlocked(this.table,b)}async getUsageOverTime(a,b){return await this.analytics.aggregateBucketsWithPipeline(this.table,b,a)}async getMostAllowedBlocked(a,b,c){return b=b??5,this.analytics.getMostAllowedBlocked(this.table,a,b,void 0,c)}},l=class{cache;constructor(a){this.cache=a}isBlocked(a){if(!this.cache.has(a))return{blocked:!1,reset:0};let b=this.cache.get(a);return b<Date.now()?(this.cache.delete(a),{blocked:!1,reset:0}):{blocked:!0,reset:b}}blockUntil(a,b){this.cache.set(a,b)}set(a,b){this.cache.set(a,b)}get(a){return this.cache.get(a)||null}incr(a){let b=this.cache.get(a)??0;return b+=1,this.cache.set(a,b),b}pop(a){this.cache.delete(a)}empty(){this.cache.clear()}size(){return this.cache.size}};function m(a){let b=a.match(/^(\d+)\s?(ms|s|m|h|d)$/);if(!b)throw Error(`Unable to parse window size: ${a}`);let c=Number.parseInt(b[1]);switch(b[2]){case"ms":return c;case"s":return 1e3*c;case"m":return 1e3*c*60;case"h":return 1e3*c*3600;case"d":return 1e3*c*86400;default:throw Error(`Unable to parse window size: ${a}`)}}var n=async(a,b,c,d)=>{try{return await a.redis.evalsha(b.hash,c,d)}catch(e){if(`${e}`.includes("NOSCRIPT"))return await a.redis.eval(b.script,c,d);throw e}},o={singleRegion:{fixedWindow:{limit:{script:`
  local key           = KEYS[1]
  local window        = ARGV[1]
  local incrementBy   = ARGV[2] -- increment rate per request at a given value, default is 1

  local r = redis.call("INCRBY", key, incrementBy)
  if r == tonumber(incrementBy) then
  -- The first time this key is set, the value will be equal to incrementBy.
  -- So we only need the expire command once
  redis.call("PEXPIRE", key, window)
  end

  return r
`,hash:"b13943e359636db027ad280f1def143f02158c13"},getRemaining:{script:`
      local key = KEYS[1]
      local tokens = 0

      local value = redis.call('GET', key)
      if value then
          tokens = value
      end
      return tokens
    `,hash:"8c4c341934502aee132643ffbe58ead3450e5208"}},slidingWindow:{limit:{script:`
  local currentKey  = KEYS[1]           -- identifier including prefixes
  local previousKey = KEYS[2]           -- key of the previous bucket
  local tokens      = tonumber(ARGV[1]) -- tokens per window
  local now         = ARGV[2]           -- current timestamp in milliseconds
  local window      = ARGV[3]           -- interval in milliseconds
  local incrementBy = ARGV[4]           -- increment rate per request at a given value, default is 1

  local requestsInCurrentWindow = redis.call("GET", currentKey)
  if requestsInCurrentWindow == false then
    requestsInCurrentWindow = 0
  end

  local requestsInPreviousWindow = redis.call("GET", previousKey)
  if requestsInPreviousWindow == false then
    requestsInPreviousWindow = 0
  end
  local percentageInCurrent = ( now % window ) / window
  -- weighted requests to consider from the previous window
  requestsInPreviousWindow = math.floor(( 1 - percentageInCurrent ) * requestsInPreviousWindow)
  if requestsInPreviousWindow + requestsInCurrentWindow >= tokens then
    return -1
  end

  local newValue = redis.call("INCRBY", currentKey, incrementBy)
  if newValue == tonumber(incrementBy) then
    -- The first time this key is set, the value will be equal to incrementBy.
    -- So we only need the expire command once
    redis.call("PEXPIRE", currentKey, window * 2 + 1000) -- Enough time to overlap with a new window + 1 second
  end
  return tokens - ( newValue + requestsInPreviousWindow )
`,hash:"e1391e429b699c780eb0480350cd5b7280fd9213"},getRemaining:{script:`
  local currentKey  = KEYS[1]           -- identifier including prefixes
  local previousKey = KEYS[2]           -- key of the previous bucket
  local now         = ARGV[1]           -- current timestamp in milliseconds
  local window      = ARGV[2]           -- interval in milliseconds

  local requestsInCurrentWindow = redis.call("GET", currentKey)
  if requestsInCurrentWindow == false then
    requestsInCurrentWindow = 0
  end

  local requestsInPreviousWindow = redis.call("GET", previousKey)
  if requestsInPreviousWindow == false then
    requestsInPreviousWindow = 0
  end

  local percentageInCurrent = ( now % window ) / window
  -- weighted requests to consider from the previous window
  requestsInPreviousWindow = math.floor(( 1 - percentageInCurrent ) * requestsInPreviousWindow)

  return requestsInPreviousWindow + requestsInCurrentWindow
`,hash:"65a73ac5a05bf9712903bc304b77268980c1c417"}},tokenBucket:{limit:{script:`
  local key         = KEYS[1]           -- identifier including prefixes
  local maxTokens   = tonumber(ARGV[1]) -- maximum number of tokens
  local interval    = tonumber(ARGV[2]) -- size of the window in milliseconds
  local refillRate  = tonumber(ARGV[3]) -- how many tokens are refilled after each interval
  local now         = tonumber(ARGV[4]) -- current timestamp in milliseconds
  local incrementBy = tonumber(ARGV[5]) -- how many tokens to consume, default is 1
        
  local bucket = redis.call("HMGET", key, "refilledAt", "tokens")
        
  local refilledAt
  local tokens

  if bucket[1] == false then
    refilledAt = now
    tokens = maxTokens
  else
    refilledAt = tonumber(bucket[1])
    tokens = tonumber(bucket[2])
  end
        
  if now >= refilledAt + interval then
    local numRefills = math.floor((now - refilledAt) / interval)
    tokens = math.min(maxTokens, tokens + numRefills * refillRate)

    refilledAt = refilledAt + numRefills * interval
  end

  if tokens == 0 then
    return {-1, refilledAt + interval}
  end

  local remaining = tokens - incrementBy
  local expireAt = math.ceil(((maxTokens - remaining) / refillRate)) * interval
        
  redis.call("HSET", key, "refilledAt", refilledAt, "tokens", remaining)
  redis.call("PEXPIRE", key, expireAt)
  return {remaining, refilledAt + interval}
`,hash:"5bece90aeef8189a8cfd28995b479529e270b3c6"},getRemaining:{script:`
  local key         = KEYS[1]
  local maxTokens   = tonumber(ARGV[1])
        
  local bucket = redis.call("HMGET", key, "refilledAt", "tokens")

  if bucket[1] == false then
    return {maxTokens, -1}
  end
        
  return {tonumber(bucket[2]), tonumber(bucket[1])}
`,hash:"a15be2bb1db2a15f7c82db06146f9d08983900d0"}},cachedFixedWindow:{limit:{script:`
  local key     = KEYS[1]
  local window  = ARGV[1]
  local incrementBy   = ARGV[2] -- increment rate per request at a given value, default is 1

  local r = redis.call("INCRBY", key, incrementBy)
  if r == incrementBy then
  -- The first time this key is set, the value will be equal to incrementBy.
  -- So we only need the expire command once
  redis.call("PEXPIRE", key, window)
  end
      
  return r
`,hash:"c26b12703dd137939b9a69a3a9b18e906a2d940f"},getRemaining:{script:`
  local key = KEYS[1]
  local tokens = 0

  local value = redis.call('GET', key)
  if value then
      tokens = value
  end
  return tokens
`,hash:"8e8f222ccae68b595ee6e3f3bf2199629a62b91a"}}},multiRegion:{fixedWindow:{limit:{script:`
	local key           = KEYS[1]
	local id            = ARGV[1]
	local window        = ARGV[2]
	local incrementBy   = tonumber(ARGV[3])

	redis.call("HSET", key, id, incrementBy)
	local fields = redis.call("HGETALL", key)
	if #fields == 2 and tonumber(fields[2])==incrementBy then
	-- The first time this key is set, and the value will be equal to incrementBy.
	-- So we only need the expire command once
	  redis.call("PEXPIRE", key, window)
	end

	return fields
`,hash:"a8c14f3835aa87bd70e5e2116081b81664abcf5c"},getRemaining:{script:`
      local key = KEYS[1]
      local tokens = 0

      local fields = redis.call("HGETALL", key)

      return fields
    `,hash:"8ab8322d0ed5fe5ac8eb08f0c2e4557f1b4816fd"}},slidingWindow:{limit:{script:`
	local currentKey    = KEYS[1]           -- identifier including prefixes
	local previousKey   = KEYS[2]           -- key of the previous bucket
	local tokens        = tonumber(ARGV[1]) -- tokens per window
	local now           = ARGV[2]           -- current timestamp in milliseconds
	local window        = ARGV[3]           -- interval in milliseconds
	local requestId     = ARGV[4]           -- uuid for this request
	local incrementBy   = tonumber(ARGV[5]) -- custom rate, default is  1

	local currentFields = redis.call("HGETALL", currentKey)
	local requestsInCurrentWindow = 0
	for i = 2, #currentFields, 2 do
	requestsInCurrentWindow = requestsInCurrentWindow + tonumber(currentFields[i])
	end

	local previousFields = redis.call("HGETALL", previousKey)
	local requestsInPreviousWindow = 0
	for i = 2, #previousFields, 2 do
	requestsInPreviousWindow = requestsInPreviousWindow + tonumber(previousFields[i])
	end

	local percentageInCurrent = ( now % window) / window
	if requestsInPreviousWindow * (1 - percentageInCurrent ) + requestsInCurrentWindow >= tokens then
	  return {currentFields, previousFields, false}
	end

	redis.call("HSET", currentKey, requestId, incrementBy)

	if requestsInCurrentWindow == 0 then 
	  -- The first time this key is set, the value will be equal to incrementBy.
	  -- So we only need the expire command once
	  redis.call("PEXPIRE", currentKey, window * 2 + 1000) -- Enough time to overlap with a new window + 1 second
	end
	return {currentFields, previousFields, true}
`,hash:"cb4fdc2575056df7c6d422764df0de3a08d6753b"},getRemaining:{script:`
	local currentKey    = KEYS[1]           -- identifier including prefixes
	local previousKey   = KEYS[2]           -- key of the previous bucket
	local now         	= ARGV[1]           -- current timestamp in milliseconds
  	local window      	= ARGV[2]           -- interval in milliseconds

	local currentFields = redis.call("HGETALL", currentKey)
	local requestsInCurrentWindow = 0
	for i = 2, #currentFields, 2 do
	requestsInCurrentWindow = requestsInCurrentWindow + tonumber(currentFields[i])
	end

	local previousFields = redis.call("HGETALL", previousKey)
	local requestsInPreviousWindow = 0
	for i = 2, #previousFields, 2 do
	requestsInPreviousWindow = requestsInPreviousWindow + tonumber(previousFields[i])
	end

	local percentageInCurrent = ( now % window) / window
  	requestsInPreviousWindow = math.floor(( 1 - percentageInCurrent ) * requestsInPreviousWindow)
	
	return requestsInCurrentWindow + requestsInPreviousWindow
`,hash:"558c9306b7ec54abb50747fe0b17e5d44bd24868"}}}},p={script:`
      local pattern = KEYS[1]

      -- Initialize cursor to start from 0
      local cursor = "0"

      repeat
          -- Scan for keys matching the pattern
          local scan_result = redis.call('SCAN', cursor, 'MATCH', pattern)

          -- Extract cursor for the next iteration
          cursor = scan_result[1]

          -- Extract keys from the scan result
          local keys = scan_result[2]

          for i=1, #keys do
          redis.call('DEL', keys[i])
          end

      -- Continue scanning until cursor is 0 (end of keyspace)
      until cursor == "0"
    `,hash:"54bd274ddc59fb3be0f42deee2f64322a10e2b50"},q="denyList",r="ipDenyList",s="ipDenyListStatus",t=`
  -- Checks if values provideed in ARGV are present in the deny lists.
  -- This is done using the allDenyListsKey below.

  -- Additionally, checks the status of the ip deny list using the
  -- ipDenyListStatusKey below. Here are the possible states of the
  -- ipDenyListStatusKey key:
  -- * status == -1: set to "disabled" with no TTL
  -- * status == -2: not set, meaning that is was set before but expired
  -- * status  >  0: set to "valid", with a TTL
  --
  -- In the case of status == -2, we set the status to "pending" with
  -- 30 second ttl. During this time, the process which got status == -2
  -- will update the ip deny list.

  local allDenyListsKey     = KEYS[1]
  local ipDenyListStatusKey = KEYS[2]

  local results = redis.call('SMISMEMBER', allDenyListsKey, unpack(ARGV))
  local status  = redis.call('TTL', ipDenyListStatusKey)
  if status == -2 then
    redis.call('SETEX', ipDenyListStatusKey, 30, "pending")
  end

  return { results, status }
`,u={};h(u,{ThresholdError:()=>v,disableIpDenyList:()=>y,updateIpDenyList:()=>x});var v=class extends Error{constructor(a){super(`Allowed threshold values are from 1 to 8, 1 and 8 included. Received: ${a}`),this.name="ThresholdError"}},w=async a=>{if("number"!=typeof a||a<1||a>8)throw new v(a);try{let b=await fetch(`https://raw.githubusercontent.com/stamparm/ipsum/master/levels/${a}.txt`);if(!b.ok)throw Error(`Error fetching data: ${b.statusText}`);return(await b.text()).split("\n").filter(a=>a.length>0)}catch(a){throw Error(`Failed to fetch ip deny list: ${a}`)}},x=async(a,b,c,d)=>{let e=await w(c),f=[b,q,"all"].join(":"),g=[b,q,r].join(":"),h=[b,s].join(":"),i=a.multi();return i.sdiffstore(f,f,g),i.del(g),i.sadd(g,e.at(0),...e.slice(1)),i.sdiffstore(g,g,f),i.sunionstore(f,f,g),i.set(h,"valid",{px:d??864e5-(Date.now()-72e5)%864e5}),await i.exec()},y=async(a,b)=>{let c=[b,q,"all"].join(":"),d=[b,q,r].join(":"),e=[b,s].join(":"),f=a.multi();return f.sdiffstore(c,c,d),f.del(d),f.set(e,"disabled"),await f.exec()},z=new l(new Map),A=async(a,b,c)=>{let d,[e,f]=await a.eval(t,[[b,q,"all"].join(":"),[b,s].join(":")],c);return e.map((a,b)=>{if(a){var e;e=c[b],z.size()>1e3&&z.empty(),z.blockUntil(e,Date.now()+6e4),d=c[b]}}),{deniedValue:d,invalidIpDenyList:-2===f}},B=class{limiter;ctx;prefix;timeout;primaryRedis;analytics;enableProtection;denyListThreshold;constructor(a){this.ctx=a.ctx,this.limiter=a.limiter,this.timeout=a.timeout??5e3,this.prefix=a.prefix??"@upstash/ratelimit",this.enableProtection=a.enableProtection??!1,this.denyListThreshold=a.denyListThreshold??6,this.primaryRedis="redis"in this.ctx?this.ctx.redis:this.ctx.regionContexts[0].redis,this.analytics=a.analytics?new k({redis:this.primaryRedis,prefix:this.prefix}):void 0,a.ephemeralCache instanceof Map?this.ctx.cache=new l(a.ephemeralCache):void 0===a.ephemeralCache&&(this.ctx.cache=new l(new Map))}limit=async(a,b)=>{let c=null;try{let d=this.getRatelimitResponse(a,b),{responseArray:e,newTimeoutId:f}=this.applyTimeout(d);c=f;let g=await Promise.race(e);return this.submitAnalytics(g,a,b)}finally{c&&clearTimeout(c)}};blockUntilReady=async(a,b)=>{let c;if(b<=0)throw Error("timeout must be positive");let d=Date.now()+b;for(;!(c=await this.limit(a)).success;){if(0===c.reset)throw Error("This should not happen");let a=Math.min(c.reset,d)-Date.now();if(await new Promise(b=>setTimeout(b,a)),Date.now()>d)break}return c};resetUsedTokens=async a=>{let b=[this.prefix,a].join(":");await this.limiter().resetTokens(this.ctx,b)};getRemaining=async a=>{let b=[this.prefix,a].join(":");return await this.limiter().getRemaining(this.ctx,b)};getRatelimitResponse=async(a,b)=>{let c=this.getKey(a),d=this.getDefinedMembers(a,b),e=d.find(a=>z.isBlocked(a).blocked),f=e?[{success:!1,limit:0,remaining:0,reset:0,pending:Promise.resolve(),reason:"denyList",deniedValue:e},{deniedValue:e,invalidIpDenyList:!1}]:await Promise.all([this.limiter().limit(this.ctx,c,b?.rate),this.enableProtection?A(this.primaryRedis,this.prefix,d):{deniedValue:void 0,invalidIpDenyList:!1}]);return((a,b,[c,d],e)=>{if(d.deniedValue&&(c.success=!1,c.remaining=0,c.reason="denyList",c.deniedValue=d.deniedValue),d.invalidIpDenyList){let d=x(a,b,e);c.pending=Promise.all([c.pending,d])}return c})(this.primaryRedis,this.prefix,f,this.denyListThreshold)};applyTimeout=a=>{let b=null,c=[a];if(this.timeout>0){let a=new Promise(a=>{b=setTimeout(()=>{a({success:!0,limit:0,remaining:0,reset:0,pending:Promise.resolve(),reason:"timeout"})},this.timeout)});c.push(a)}return{responseArray:c,newTimeoutId:b}};submitAnalytics=(a,b,c)=>{if(this.analytics)try{let d=c?this.analytics.extractGeo(c):void 0,e=this.analytics.record({identifier:"denyList"===a.reason?a.deniedValue:b,time:Date.now(),success:"denyList"===a.reason?"denied":a.success,...d}).catch(a=>{let b="Failed to record analytics";`${a}`.includes("WRONGTYPE")&&(b=`
    Failed to record analytics. See the information below:

    This can occur when you uprade to Ratelimit version 1.1.2
    or later from an earlier version.

    This occurs simply because the way we store analytics data
    has changed. To avoid getting this error, disable analytics
    for *an hour*, then simply enable it back.

    `),console.warn(b,a)});a.pending=Promise.all([a.pending,e])}catch(a){console.warn("Failed to record analytics",a)}return a};getKey=a=>[this.prefix,a].join(":");getDefinedMembers=(a,b)=>[a,b?.ip,b?.userAgent,b?.country].filter(Boolean)};function C(){let a="",b="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789",c=b.length;for(let d=0;d<16;d++)a+=b.charAt(Math.floor(Math.random()*c));return a}var D=class extends B{constructor(a){super({prefix:a.prefix,limiter:a.limiter,timeout:a.timeout,analytics:a.analytics,ctx:{regionContexts:a.redis.map(a=>({redis:a})),cache:a.ephemeralCache?new l(a.ephemeralCache):void 0}})}static fixedWindow(a,b){let c=m(b);return()=>({async limit(b,d,e){if(b.cache){let{blocked:c,reset:e}=b.cache.isBlocked(d);if(c)return{success:!1,limit:a,remaining:0,reset:e,pending:Promise.resolve(),reason:"cacheBlock"}}let f=C(),g=Math.floor(Date.now()/c),h=[d,g].join(":"),i=e?Math.max(1,e):1,j=b.regionContexts.map(a=>({redis:a.redis,request:n(a,o.multiRegion.fixedWindow.limit,[h],[f,c,i])})),k=a-(await Promise.any(j.map(a=>a.request))).reduce((a,b,c)=>{let d=0;return c%2&&(d=Number.parseInt(b)),a+d},0);async function l(){let b=[...new Set((await Promise.all(j.map(a=>a.request))).flat().reduce((a,b,c)=>(c%2==0&&a.push(b),a),[])).values()];for(let c of j){let d=(await c.request).reduce((a,b,c)=>{let d=0;return c%2&&(d=Number.parseInt(b)),a+d},0),e=(await c.request).reduce((a,b,c)=>(c%2==0&&a.push(b),a),[]);if(d>=a)continue;let f=b.filter(a=>!e.includes(a));if(0!==f.length)for(let a of f)await c.redis.hset(h,{[a]:i})}}let m=k>0,p=(g+1)*c;return b.cache&&!m&&b.cache.blockUntil(d,p),{success:m,limit:a,remaining:k,reset:p,pending:l()}},async getRemaining(b,d){let e=Math.floor(Date.now()/c),f=[d,e].join(":"),g=b.regionContexts.map(a=>({redis:a.redis,request:n(a,o.multiRegion.fixedWindow.getRemaining,[f],[null])}));return{remaining:Math.max(0,a-(await Promise.any(g.map(a=>a.request))).reduce((a,b,c)=>{let d=0;return c%2&&(d=Number.parseInt(b)),a+d},0)),reset:(e+1)*c}},async resetTokens(a,b){let c=[b,"*"].join(":");a.cache&&a.cache.pop(b),await Promise.all(a.regionContexts.map(a=>{n(a,p,[c],[null])}))}})}static slidingWindow(a,b){let c=m(b),d=m(b);return()=>({async limit(b,e,f){if(b.cache){let{blocked:c,reset:d}=b.cache.isBlocked(e);if(c)return{success:!1,limit:a,remaining:0,reset:d,pending:Promise.resolve(),reason:"cacheBlock"}}let g=C(),h=Date.now(),i=Math.floor(h/c),j=[e,i].join(":"),k=[e,i-1].join(":"),l=f?Math.max(1,f):1,m=b.regionContexts.map(b=>({redis:b.redis,request:n(b,o.multiRegion.slidingWindow.limit,[j,k],[a,h,d,g,l])})),p=h%d/d,[q,r,s]=await Promise.any(m.map(a=>a.request));s&&q.push(g,l.toString());let t=r.reduce((a,b,c)=>{let d=0;return c%2&&(d=Number.parseInt(b)),a+d},0),u=q.reduce((a,b,c)=>{let d=0;return c%2&&(d=Number.parseInt(b)),a+d},0),v=a-(Math.ceil(t*(1-p))+u);async function w(){let b=[...new Set((await Promise.all(m.map(a=>a.request))).flatMap(([a])=>a).reduce((a,b,c)=>(c%2==0&&a.push(b),a),[])).values()];for(let c of m){let[d,e,f]=await c.request,g=d.reduce((a,b,c)=>(c%2==0&&a.push(b),a),[]);if(d.reduce((a,b,c)=>{let d=0;return c%2&&(d=Number.parseInt(b)),a+d},0)>=a)continue;let h=b.filter(a=>!g.includes(a));if(0!==h.length)for(let a of h)await c.redis.hset(j,{[a]:l})}}let x=(i+1)*d;return b.cache&&!s&&b.cache.blockUntil(e,x),{success:!!s,limit:a,remaining:Math.max(0,v),reset:x,pending:w()}},async getRemaining(b,d){let e=Date.now(),f=Math.floor(e/c),g=[d,f].join(":"),h=[d,f-1].join(":"),i=b.regionContexts.map(a=>({redis:a.redis,request:n(a,o.multiRegion.slidingWindow.getRemaining,[g,h],[e,c])}));return{remaining:Math.max(0,a-await Promise.any(i.map(a=>a.request))),reset:(f+1)*c}},async resetTokens(a,b){let c=[b,"*"].join(":");a.cache&&a.cache.pop(b),await Promise.all(a.regionContexts.map(a=>{n(a,p,[c],[null])}))}})}},E=class extends B{constructor(a){super({prefix:a.prefix,limiter:a.limiter,timeout:a.timeout,analytics:a.analytics,ctx:{redis:a.redis},ephemeralCache:a.ephemeralCache,enableProtection:a.enableProtection,denyListThreshold:a.denyListThreshold})}static fixedWindow(a,b){let c=m(b);return()=>({async limit(b,d,e){let f=Math.floor(Date.now()/c),g=[d,f].join(":");if(b.cache){let{blocked:c,reset:e}=b.cache.isBlocked(d);if(c)return{success:!1,limit:a,remaining:0,reset:e,pending:Promise.resolve(),reason:"cacheBlock"}}let h=e?Math.max(1,e):1,i=await n(b,o.singleRegion.fixedWindow.limit,[g],[c,h]),j=i<=a,k=Math.max(0,a-i),l=(f+1)*c;return b.cache&&!j&&b.cache.blockUntil(d,l),{success:j,limit:a,remaining:k,reset:l,pending:Promise.resolve()}},async getRemaining(b,d){let e=Math.floor(Date.now()/c),f=[d,e].join(":");return{remaining:Math.max(0,a-await n(b,o.singleRegion.fixedWindow.getRemaining,[f],[null])),reset:(e+1)*c}},async resetTokens(a,b){let c=[b,"*"].join(":");a.cache&&a.cache.pop(b),await n(a,p,[c],[null])}})}static slidingWindow(a,b){let c=m(b);return()=>({async limit(b,d,e){let f=Date.now(),g=Math.floor(f/c),h=[d,g].join(":"),i=[d,g-1].join(":");if(b.cache){let{blocked:c,reset:e}=b.cache.isBlocked(d);if(c)return{success:!1,limit:a,remaining:0,reset:e,pending:Promise.resolve(),reason:"cacheBlock"}}let j=e?Math.max(1,e):1,k=await n(b,o.singleRegion.slidingWindow.limit,[h,i],[a,f,c,j]),l=k>=0,m=(g+1)*c;return b.cache&&!l&&b.cache.blockUntil(d,m),{success:l,limit:a,remaining:Math.max(0,k),reset:m,pending:Promise.resolve()}},async getRemaining(b,d){let e=Date.now(),f=Math.floor(e/c),g=[d,f].join(":"),h=[d,f-1].join(":");return{remaining:Math.max(0,a-await n(b,o.singleRegion.slidingWindow.getRemaining,[g,h],[e,c])),reset:(f+1)*c}},async resetTokens(a,b){let c=[b,"*"].join(":");a.cache&&a.cache.pop(b),await n(a,p,[c],[null])}})}static tokenBucket(a,b,c){let d=m(b);return()=>({async limit(b,e,f){if(b.cache){let{blocked:a,reset:d}=b.cache.isBlocked(e);if(a)return{success:!1,limit:c,remaining:0,reset:d,pending:Promise.resolve(),reason:"cacheBlock"}}let g=Date.now(),h=f?Math.max(1,f):1,[i,j]=await n(b,o.singleRegion.tokenBucket.limit,[e],[c,d,a,g,h]),k=i>=0;return b.cache&&!k&&b.cache.blockUntil(e,j),{success:k,limit:c,remaining:i,reset:j,pending:Promise.resolve()}},async getRemaining(a,b){let[e,f]=await n(a,o.singleRegion.tokenBucket.getRemaining,[b],[c]),g=Date.now()+d,h=f+d;return{remaining:e,reset:-1===f?g:h}},async resetTokens(a,b){a.cache&&a.cache.pop(b),await n(a,p,[b],[null])}})}static cachedFixedWindow(a,b){let c=m(b);return()=>({async limit(b,d,e){if(!b.cache)throw Error("This algorithm requires a cache");let f=Math.floor(Date.now()/c),g=[d,f].join(":"),h=(f+1)*c,i=e?Math.max(1,e):1;if("number"==typeof b.cache.get(g)){let d=b.cache.incr(g),e=d<a,f=e?n(b,o.singleRegion.cachedFixedWindow.limit,[g],[c,i]):Promise.resolve();return{success:e,limit:a,remaining:a-d,reset:h,pending:f}}let j=await n(b,o.singleRegion.cachedFixedWindow.limit,[g],[c,i]);b.cache.set(g,j);let k=a-j;return{success:k>=0,limit:a,remaining:k,reset:h,pending:Promise.resolve()}},async getRemaining(b,d){if(!b.cache)throw Error("This algorithm requires a cache");let e=Math.floor(Date.now()/c),f=[d,e].join(":");return"number"==typeof b.cache.get(f)?{remaining:Math.max(0,a-(b.cache.get(f)??0)),reset:(e+1)*c}:{remaining:Math.max(0,a-await n(b,o.singleRegion.cachedFixedWindow.getRemaining,[f],[null])),reset:(e+1)*c}},async resetTokens(a,b){if(!a.cache)throw Error("This algorithm requires a cache");let d=[b,Math.floor(Date.now()/c)].join(":");a.cache.pop(d);let e=[b,"*"].join(":");await n(a,p,[e],[null])}})}}},4134:(a,b)=>{b.qg=function(a,b){let c=new h,d=a.length;if(d<2)return c;let e=b?.decode||k,f=0;do{let b=a.indexOf("=",f);if(-1===b)break;let g=a.indexOf(";",f),h=-1===g?d:g;if(b>h){f=a.lastIndexOf(";",b-1)+1;continue}let k=i(a,f,b),l=j(a,b,k),m=a.slice(k,l);if(void 0===c[m]){let d=i(a,b+1,h),f=j(a,h,d),g=e(a.slice(d,f));c[m]=g}f=h+1}while(f<d);return c},b.lK=function(a,b,h){let i=h?.encode||encodeURIComponent;if(!c.test(a))throw TypeError(`argument name is invalid: ${a}`);let j=i(b);if(!d.test(j))throw TypeError(`argument val is invalid: ${b}`);let k=a+"="+j;if(!h)return k;if(void 0!==h.maxAge){if(!Number.isInteger(h.maxAge))throw TypeError(`option maxAge is invalid: ${h.maxAge}`);k+="; Max-Age="+h.maxAge}if(h.domain){if(!e.test(h.domain))throw TypeError(`option domain is invalid: ${h.domain}`);k+="; Domain="+h.domain}if(h.path){if(!f.test(h.path))throw TypeError(`option path is invalid: ${h.path}`);k+="; Path="+h.path}if(h.expires){var l;if(l=h.expires,"[object Date]"!==g.call(l)||!Number.isFinite(h.expires.valueOf()))throw TypeError(`option expires is invalid: ${h.expires}`);k+="; Expires="+h.expires.toUTCString()}if(h.httpOnly&&(k+="; HttpOnly"),h.secure&&(k+="; Secure"),h.partitioned&&(k+="; Partitioned"),h.priority)switch("string"==typeof h.priority?h.priority.toLowerCase():void 0){case"low":k+="; Priority=Low";break;case"medium":k+="; Priority=Medium";break;case"high":k+="; Priority=High";break;default:throw TypeError(`option priority is invalid: ${h.priority}`)}if(h.sameSite)switch("string"==typeof h.sameSite?h.sameSite.toLowerCase():h.sameSite){case!0:case"strict":k+="; SameSite=Strict";break;case"lax":k+="; SameSite=Lax";break;case"none":k+="; SameSite=None";break;default:throw TypeError(`option sameSite is invalid: ${h.sameSite}`)}return k};let c=/^[\u0021-\u003A\u003C\u003E-\u007E]+$/,d=/^[\u0021-\u003A\u003C-\u007E]*$/,e=/^([.]?[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)([.][a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)*$/i,f=/^[\u0020-\u003A\u003D-\u007E]*$/,g=Object.prototype.toString,h=(()=>{let a=function(){};return a.prototype=Object.create(null),a})();function i(a,b,c){do{let c=a.charCodeAt(b);if(32!==c&&9!==c)return b}while(++b<c);return c}function j(a,b,c){for(;b>c;){let c=a.charCodeAt(--b);if(32!==c&&9!==c)return b+1}return c}function k(a){if(-1===a.indexOf("%"))return a;try{return decodeURIComponent(a)}catch(b){return a}}}};