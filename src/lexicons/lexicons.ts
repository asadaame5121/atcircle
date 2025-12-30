/**
 * GENERATED CODE - DO NOT MODIFY
 */
import {
    type LexiconDoc,
    Lexicons,
    ValidationError,
    type ValidationResult,
} from "@atproto/lexicon";
import { is$typed, maybe$typed } from "./util.js";

export const schemaDict = {
    NetAsadaame5121AtCircleBanner: {
        lexicon: 1,
        id: "net.asadaame5121.at-circle.banner",
        defs: {
            main: {
                type: "record",
                description: "A banner image for a ring",
                key: "tid",
                record: {
                    type: "object",
                    required: ["ring", "banner", "createdAt"],
                    properties: {
                        ring: {
                            type: "ref",
                            ref: "lex:net.asadaame5121.at-circle.defs#ringRef",
                        },
                        banner: {
                            type: "blob",
                            accept: ["image/*"],
                            maxSize: 1000000,
                        },
                        createdAt: {
                            type: "string",
                            format: "datetime",
                        },
                    },
                },
            },
        },
    },
    NetAsadaame5121AtCircleBlock: {
        lexicon: 1,
        id: "net.asadaame5121.at-circle.block",
        defs: {
            main: {
                type: "record",
                description: "Block/Kick a member from the circle",
                key: "tid",
                record: {
                    type: "object",
                    required: ["subject", "ring", "createdAt"],
                    properties: {
                        subject: {
                            type: "string",
                            format: "did",
                            description: "DID of the member to block",
                        },
                        ring: {
                            type: "ref",
                            ref: "lex:net.asadaame5121.at-circle.defs#ringRef",
                        },
                        reason: {
                            type: "string",
                            maxLength: 1000,
                            maxGraphemes: 100,
                            description: "Reason for blocking",
                        },
                        createdAt: {
                            type: "string",
                            format: "datetime",
                        },
                    },
                },
            },
        },
    },
    NetAsadaame5121AtCircleDefs: {
        lexicon: 1,
        id: "net.asadaame5121.at-circle.defs",
        defs: {
            ringRef: {
                type: "object",
                required: ["uri"],
                properties: {
                    uri: {
                        type: "string",
                        format: "at-uri",
                        description: "AT-URI of the Ring",
                    },
                    cid: {
                        type: "string",
                        format: "cid",
                        description: "Optional CID for strong reference",
                    },
                },
            },
        },
    },
    NetAsadaame5121AtCircleMember: {
        lexicon: 1,
        id: "net.asadaame5121.at-circle.member",
        defs: {
            main: {
                type: "record",
                description: "Membership in an at-circle (Sidecar Record)",
                key: "tid",
                record: {
                    type: "object",
                    required: ["ring", "url", "title", "createdAt"],
                    properties: {
                        ring: {
                            type: "ref",
                            ref: "lex:net.asadaame5121.at-circle.defs#ringRef",
                        },
                        url: {
                            type: "string",
                            format: "uri",
                            description: "URL of the participant's site",
                        },
                        title: {
                            type: "string",
                            maxLength: 1000,
                            maxGraphemes: 100,
                            description: "Title of the participant's site",
                        },
                        rss: {
                            type: "string",
                            format: "uri",
                            description: "RSS feed URL",
                        },
                        createdAt: {
                            type: "string",
                            format: "datetime",
                        },
                        note: {
                            type: "string",
                            maxLength: 3000,
                            maxGraphemes: 300,
                            description: "Optional note",
                        },
                    },
                },
            },
        },
    },
    NetAsadaame5121AtCircleRequest: {
        lexicon: 1,
        id: "net.asadaame5121.at-circle.request",
        defs: {
            main: {
                type: "record",
                description: "A request to join a webring",
                key: "tid",
                record: {
                    type: "object",
                    required: ["ring", "siteUrl", "siteTitle", "createdAt"],
                    properties: {
                        ring: {
                            type: "ref",
                            ref: "lex:net.asadaame5121.at-circle.defs#ringRef",
                        },
                        siteUrl: {
                            type: "string",
                            format: "uri",
                            description: "URL of the site to register",
                        },
                        siteTitle: {
                            type: "string",
                            maxLength: 1000,
                            maxGraphemes: 100,
                            description: "Title of the site",
                        },
                        rssUrl: {
                            type: "string",
                            format: "uri",
                            description: "RSS feed URL of the site",
                        },
                        message: {
                            type: "string",
                            maxLength: 1000,
                            maxGraphemes: 100,
                            description: "Introduction message",
                        },
                        createdAt: {
                            type: "string",
                            format: "datetime",
                        },
                    },
                },
            },
        },
    },
    NetAsadaame5121AtCircleRing: {
        lexicon: 1,
        id: "net.asadaame5121.at-circle.ring",
        defs: {
            main: {
                type: "record",
                description: "An at-circle group definition",
                key: "tid",
                record: {
                    type: "object",
                    required: ["title", "createdAt", "status", "admin"],
                    properties: {
                        title: {
                            type: "string",
                            maxLength: 1000,
                            maxGraphemes: 100,
                            description: "Name of the circle",
                        },
                        description: {
                            type: "string",
                            maxLength: 10000,
                            maxGraphemes: 1000,
                            description: "Description of the circle",
                        },
                        admin: {
                            type: "string",
                            format: "did",
                            maxLength: 1000,
                            description: "DID of the ring administrator",
                        },
                        status: {
                            type: "string",
                            knownValues: ["open", "closed"],
                            maxLength: 100,
                            description: "Recruitment status",
                        },
                        acceptancePolicy: {
                            type: "string",
                            knownValues: ["automatic", "manual"],
                            maxLength: 100,
                            description: "How new members are accepted",
                        },
                        createdAt: {
                            type: "string",
                            format: "datetime",
                        },
                    },
                },
            },
        },
    },
} as const satisfies Record<string, LexiconDoc>;
export const schemas = Object.values(schemaDict) satisfies LexiconDoc[];
export const lexicons: Lexicons = new Lexicons(schemas);

export function validate<T extends { $type: string }>(
    v: unknown,
    id: string,
    hash: string,
    requiredType: true,
): ValidationResult<T>;
export function validate<T extends { $type?: string }>(
    v: unknown,
    id: string,
    hash: string,
    requiredType?: false,
): ValidationResult<T>;
export function validate(
    v: unknown,
    id: string,
    hash: string,
    requiredType?: boolean,
): ValidationResult {
    return (requiredType ? is$typed : maybe$typed)(v, id, hash)
        ? lexicons.validate(`${id}#${hash}`, v)
        : {
              success: false,
              error: new ValidationError(
                  `Must be an object with "${hash === "main" ? id : `${id}#${hash}`}" $type property`,
              ),
          };
}

export const ids = {
    NetAsadaame5121AtCircleBanner: "net.asadaame5121.at-circle.banner",
    NetAsadaame5121AtCircleBlock: "net.asadaame5121.at-circle.block",
    NetAsadaame5121AtCircleDefs: "net.asadaame5121.at-circle.defs",
    NetAsadaame5121AtCircleMember: "net.asadaame5121.at-circle.member",
    NetAsadaame5121AtCircleRequest: "net.asadaame5121.at-circle.request",
    NetAsadaame5121AtCircleRing: "net.asadaame5121.at-circle.ring",
} as const;
