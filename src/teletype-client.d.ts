
declare module '@atom/teletype-client' {

    export class TeletypeClient {
        // constructor(restGateway:any, pubSubGateway: any, connectionTimeout:any,tetherDisconnectWindow: any,testEpoch :any,  pusherKey: any, pusherOptions: any, baseURL: any, didCreateOrJoinPortal:any );
        // constructor(restGateway: any, pubSubGateway: any );
        constructor(...args: any[]);

        createPortal(...args: any[]): void;

        dispose(...args: any[]): void;

        getClientId(...args: any[]): void;

        getLocalUserIdentity(...args: any[]): void;

        initialize(...args: any[]): void;

        isSignedIn(...args: any[]): void;

        joinPortal(...args: any[]): void;

        onConnectionError(...args: any[]): void;

        onSignInChange(...args: any[]): void;

        peerPoolDidError(...args: any[]): void;

        signIn(...args: any[]): void;

        signOut(...args: any[]): void;
    }

    export const FollowState: {
        DISCONNECTED: number;
        EXTENDED: number;
        RETRACTED: number;
    };

    export namespace Errors {
        function ClientOutOfDateError(...args: any[]): void;

        function HTTPRequestError(...args: any[]): void;

        function InvalidAuthenticationTokenError(...args: any[]): void;

        function NetworkConnectionError(...args: any[]): void;

        function PeerConnectionError(...args: any[]): void;

        function PortalCreationError(...args: any[]): void;

        function PortalJoinError(...args: any[]): void;

        function PortalNotFoundError(...args: any[]): void;

        function PubSubConnectionError(...args: any[]): void;

        function UnexpectedAuthenticationError(...args: any[]): void;

        namespace ClientOutOfDateError {
            const stackTraceLimit: number;

            function captureStackTrace(p0: any, p1: any): any;

        }

        namespace HTTPRequestError {
            const stackTraceLimit: number;

            function captureStackTrace(p0: any, p1: any): any;

        }

        namespace InvalidAuthenticationTokenError {
            const stackTraceLimit: number;

            function captureStackTrace(p0: any, p1: any): any;

        }

        namespace NetworkConnectionError {
            const stackTraceLimit: number;

            function captureStackTrace(p0: any, p1: any): any;

        }

        namespace PeerConnectionError {
            const stackTraceLimit: number;

            function captureStackTrace(p0: any, p1: any): any;

        }

        namespace PortalCreationError {
            const stackTraceLimit: number;

            function captureStackTrace(p0: any, p1: any): any;

        }

        namespace PortalJoinError {
            const stackTraceLimit: number;

            function captureStackTrace(p0: any, p1: any): any;

        }

        namespace PortalNotFoundError {
            const stackTraceLimit: number;

            function captureStackTrace(p0: any, p1: any): any;

        }

        namespace PubSubConnectionError {
            const stackTraceLimit: number;

            function captureStackTrace(p0: any, p1: any): any;

        }

        namespace UnexpectedAuthenticationError {
            const stackTraceLimit: number;

            function captureStackTrace(p0: any, p1: any): any;

        }

    }

}