
<!-- START lex generated content. Please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION! INSTEAD RE-RUN lex TO UPDATE -->
---

## net.asadaame5121.at-circle.banner

```json
{
  "lexicon": 1,
  "id": "net.asadaame5121.at-circle.banner",
  "defs": {
    "main": {
      "type": "record",
      "description": "A banner image for a ring",
      "key": "tid",
      "record": {
        "type": "object",
        "required": [
          "ring",
          "banner",
          "createdAt"
        ],
        "properties": {
          "ring": {
            "type": "ref",
            "ref": "net.asadaame5121.at-circle.defs#ringRef"
          },
          "banner": {
            "type": "blob",
            "accept": [
              "image/*"
            ],
            "maxSize": 1000000
          },
          "createdAt": {
            "type": "string",
            "format": "datetime"
          }
        }
      }
    }
  }
}
```
---

## net.asadaame5121.at-circle.block

```json
{
  "lexicon": 1,
  "id": "net.asadaame5121.at-circle.block",
  "defs": {
    "main": {
      "type": "record",
      "description": "Block/Kick a member from the circle",
      "key": "tid",
      "record": {
        "type": "object",
        "required": [
          "subject",
          "ring",
          "createdAt"
        ],
        "properties": {
          "subject": {
            "type": "string",
            "format": "did",
            "description": "DID of the member to block"
          },
          "ring": {
            "type": "ref",
            "ref": "net.asadaame5121.at-circle.defs#ringRef"
          },
          "reason": {
            "type": "string",
            "maxLength": 1000,
            "maxGraphemes": 100,
            "description": "Reason for blocking"
          },
          "createdAt": {
            "type": "string",
            "format": "datetime"
          }
        }
      }
    }
  }
}
```
---

## net.asadaame5121.at-circle.defs

```json
{
  "lexicon": 1,
  "id": "net.asadaame5121.at-circle.defs",
  "defs": {
    "ringRef": {
      "type": "object",
      "required": [
        "uri"
      ],
      "properties": {
        "uri": {
          "type": "string",
          "format": "at-uri",
          "description": "AT-URI of the Ring"
        },
        "cid": {
          "type": "string",
          "format": "cid",
          "description": "Optional CID for strong reference"
        }
      }
    }
  }
}
```
---

## net.asadaame5121.at-circle.member

```json
{
  "lexicon": 1,
  "id": "net.asadaame5121.at-circle.member",
  "defs": {
    "main": {
      "type": "record",
      "description": "Membership in an at-circle (Sidecar Record)",
      "key": "tid",
      "record": {
        "type": "object",
        "required": [
          "ring",
          "url",
          "title",
          "createdAt"
        ],
        "properties": {
          "ring": {
            "type": "ref",
            "ref": "net.asadaame5121.at-circle.defs#ringRef"
          },
          "url": {
            "type": "string",
            "format": "uri",
            "description": "URL of the participant's site"
          },
          "title": {
            "type": "string",
            "maxLength": 1000,
            "maxGraphemes": 100,
            "description": "Title of the participant's site"
          },
          "rss": {
            "type": "string",
            "format": "uri",
            "description": "RSS feed URL"
          },
          "createdAt": {
            "type": "string",
            "format": "datetime"
          },
          "note": {
            "type": "string",
            "maxLength": 3000,
            "maxGraphemes": 300,
            "description": "Optional note"
          }
        }
      }
    }
  }
}
```
---

## net.asadaame5121.at-circle.request

```json
{
  "lexicon": 1,
  "id": "net.asadaame5121.at-circle.request",
  "defs": {
    "main": {
      "type": "record",
      "description": "A request to join a webring",
      "key": "tid",
      "record": {
        "type": "object",
        "required": [
          "ring",
          "siteUrl",
          "siteTitle",
          "createdAt"
        ],
        "properties": {
          "ring": {
            "type": "ref",
            "ref": "net.asadaame5121.at-circle.defs#ringRef"
          },
          "siteUrl": {
            "type": "string",
            "format": "uri",
            "description": "URL of the site to register"
          },
          "siteTitle": {
            "type": "string",
            "maxLength": 1000,
            "maxGraphemes": 100,
            "description": "Title of the site"
          },
          "rssUrl": {
            "type": "string",
            "format": "uri",
            "description": "RSS feed URL of the site"
          },
          "message": {
            "type": "string",
            "maxLength": 1000,
            "maxGraphemes": 100,
            "description": "Introduction message"
          },
          "createdAt": {
            "type": "string",
            "format": "datetime"
          }
        }
      }
    }
  }
}
```
---

## net.asadaame5121.at-circle.ring

```json
{
  "lexicon": 1,
  "id": "net.asadaame5121.at-circle.ring",
  "defs": {
    "main": {
      "type": "record",
      "description": "An at-circle group definition",
      "key": "tid",
      "record": {
        "type": "object",
        "required": [
          "title",
          "createdAt",
          "status",
          "admin"
        ],
        "properties": {
          "title": {
            "type": "string",
            "maxLength": 1000,
            "maxGraphemes": 100,
            "description": "Name of the circle"
          },
          "description": {
            "type": "string",
            "maxLength": 10000,
            "maxGraphemes": 1000,
            "description": "Description of the circle"
          },
          "admin": {
            "type": "string",
            "format": "did",
            "maxLength": 1000,
            "description": "DID of the ring administrator"
          },
          "status": {
            "type": "string",
            "knownValues": [
              "open",
              "closed"
            ],
            "maxLength": 100,
            "description": "Recruitment status"
          },
          "acceptancePolicy": {
            "type": "string",
            "knownValues": [
              "automatic",
              "manual"
            ],
            "maxLength": 100,
            "description": "How new members are accepted"
          },
          "createdAt": {
            "type": "string",
            "format": "datetime"
          }
        }
      }
    }
  }
}
```
<!-- END lex generated TOC please keep comment here to allow auto update -->