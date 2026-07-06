#!/usr/bin/env ruby
# Simple Ruby script for Conduit.js testing

require 'json'

name = ARGV[0] || 'User'

puts "Ruby says: Hello, #{name}!"
puts "Ruby version: #{RUBY_VERSION}"

# Return JSON result
result = {
  language: 'Ruby',
  greeting: "Hello from Ruby, #{name}!",
  version: RUBY_VERSION,
  status: 'success'
}

puts JSON.generate(result)
