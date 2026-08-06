#!/bin/sh
# Fly's internal DNS (fdaa::3) fails to return _atproto TXT records,
# which breaks handle resolution. Use public resolvers instead.
echo "nameserver 8.8.8.8" > /etc/resolv.conf
echo "nameserver 1.1.1.1" >> /etc/resolv.conf
exec dumb-init -- node --enable-source-maps index.ts
