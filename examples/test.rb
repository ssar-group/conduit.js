#!/usr/bin/env ruby

require 'json'

name = ARGV[0] || 'User'

puts "Ruby says: Hello, #{name}!"
puts "Ruby version: #{RUBY_VERSION}"

result = {
  language: 'Ruby',
  greeting: "Hello from Ruby, #{name}!",
  version: RUBY_VERSION,
  status: 'success'
}

puts JSON.generate(result)
