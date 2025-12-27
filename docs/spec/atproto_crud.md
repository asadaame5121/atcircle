# ATProto Ring & Member CRUD Specification

This document details the operations for managing Webrings on the AT Protocol
using the `@atproto/api` SDK.

## Prerequisites

- **Agent**: An authenticated `AtpAgent` instance.
- **NSIDs**:
  - Ring: `com.webring.ring`
  - Member: `com.webring.member`
  - Block: `com.webring.block`

## 1. Ring Operations

### 1.1 Create a Ring

Create a record in the `com.webring.ring` collection.

```typescript
async function createRing(agent: AtpAgent, title: string, description: string) {
    const record = {
        $type: "com.webring.ring",
        title: title,
        description: description,
        createdAt: new Date().toISOString(),
    };

    const response = await agent.api.com.atproto.repo.createRecord({
        repo: agent.session?.did ?? "",
        collection: "com.webring.ring",
        record: record,
    });

    return response.uri;
}
```

### 1.2 List Rings (listRings)

Fetch records with pagination.

```typescript
async function listRings(
    agent: AtpAgent,
    ownerDid: string,
    cursor?: string,
    limit: number = 50,
) {
    // Currently wraps com.atproto.repo.listRecords
    const response = await agent.api.com.atproto.repo.listRecords({
        repo: ownerDid,
        collection: "com.webring.ring",
        cursor: cursor,
        limit: limit,
    });
    return response.data;
}
```

## 2. Membership Operations (Sidecar Pattern)

Membership is declared by the user creates a `com.webring.member` record in
their own repository.

### 2.1 Join a Ring

Create a `com.webring.member` record that references the Ring's AT-URI.

```typescript
async function joinRing(
    agent: AtpAgent,
    ringUri: string,
    siteData: { url: string; title: string; rss?: string },
) {
    const record = {
        $type: "com.webring.member",
        ring: ringUri, // Reference to the Ring
        url: siteData.url,
        title: siteData.title,
        rss: siteData.rss,
        createdAt: new Date().toISOString(),
    };

    const response = await agent.api.com.atproto.repo.createRecord({
        repo: agent.session?.did ?? "",
        collection: "com.webring.member",
        record: record,
    });

    return response.uri;
}
```

### 2.2 Leave a Ring

Delete the `com.webring.member` record. This removes the "Sidecar" declaration.

```typescript
async function leaveRing(agent: AtpAgent, memberRecordUri: string) {
    const { rkey } = new AtUri(memberRecordUri);

    await agent.api.com.atproto.repo.deleteRecord({
        repo: agent.session?.did ?? "",
        collection: "com.webring.member",
        rkey: rkey,
    });
}
```

### 2.3 List Members (listMembers)

To show the list of members for a Ring:

1. **List all candidates**: Typically requires an AppView. For MVP, we query our
   D1 cache or specific known repos.
2. **Fetch blocks**: Query the Ring Owner's repository for `com.webring.block`.
3. **Filter**: Exclude blocked members.

```typescript
async function listMembers(
    agent: AtpAgent,
    ringUri: string,
    cursor?: string,
    limit: number = 50,
) {
    // In a full AppView, this would be a single API call:
    // return agent.api.com.webring.view.listMembers({ ring: ringUri, cursor, limit });

    // For MVP PDS-only interaction, this logic resides in the backend service.
}
```

## 3. Moderation (Kick/Block)

### 3.1 Block a Member

The Ring Owner creates a block record.

```typescript
async function blockMember(
    agent: AtpAgent,
    ringUri: string,
    memberDid: string,
    reason?: string,
) {
    const record = {
        $type: "com.webring.block",
        ring: ringUri,
        subject: memberDid,
        reason: reason,
        createdAt: new Date().toISOString(),
    };

    await agent.api.com.atproto.repo.createRecord({
        repo: agent.session?.did ?? "",
        collection: "com.webring.block",
        record: record,
    });
}
```
