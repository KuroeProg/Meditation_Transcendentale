require 'English'
pattern = /(?<clientip>\S+) (?<ident>\S+) (?<auth>\S+) \[(?<timestamp>[^\]]+)\] "(?<request>[^"]*)" (?<response>\d+) (?<bytes>\d+|-) "(?<referrer>[^"]*)" "(?<agent>[^"]*)"(?: "(?<x_forwarded_for>[^"]*)")?/

line = '::1 - - [22/Apr/2026:09:36:45 +0000] "GET / HTTP/2.0" 200 722 "-" "curl/8.14.1" "-"'
match = pattern.match(line)

if match
  puts "Matches!"
  puts "response: #{match['response']}"
  puts "bytes: #{match['bytes']}"
  puts "x_forwarded_for: #{match['x_forwarded_for']}"
else
  puts "No match."
end
