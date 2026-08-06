FROM ghcr.io/bluesky-social/pds

USER root
# Dev PDS only: allow same-site (same registrable domain, different subdomain)
# OAuth navigation from the dev app (dev-at-circle.asadaame5121.net) to the dev PDS
# (pds-dev.asadaame5121.net). oauth-provider 0.19.5 rejects sec-fetch-site: same-site;
# newer versions allow it. Re-apply after PDS upgrades if the provider version changes.
RUN sed -i "s|\['same-origin', 'cross-site', 'none'\]|['same-origin', 'same-site', 'cross-site', 'none']|" \
    /app/node_modules/.pnpm/@atproto+oauth-provider@0.19.5/node_modules/@atproto/oauth-provider/dist/router/create-authorization-page-middleware.js

COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

ENTRYPOINT ["/entrypoint.sh"]
