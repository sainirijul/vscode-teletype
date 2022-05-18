//import { Position } from "./teletype-types";
declare module '@atom/teletype-client' {
    export interface Position {
        row: number;
        column: number;
    }

    export interface IBufferDelegate {
        dispose() : void;
        setText(text: string) : void;
        didChangeURI(uri: string) : void;
        save() : void;
        updateText(updates: any[]) : void;
    }

    export class BufferProxy {
        id: number;
        uri: any;
		onDidChangeBuffer: any;
        // constructor({id, uri, text, history, operations, router, hostPeerId, siteId, didDispose});
        constructor(...args: any[]);

        applyGroupingInterval(applyGroupingInterval: number): void;

        broadcastOperations(...args: any[]): void;

        broadcastURIChange(...args: any[]): void;

        broadcastUpdate(...args: any[]): void;

        createCheckpoint(...args: any[]): Checkpoint;

        dispose(...args: any[]): void;

        getChangesSinceCheckpoint(...args: any[]): void;

        getHistory(...args: any[]): void;

        getMarkers(...args: any[]): void;

        getNextMarkerLayerId(...args: any[]): void;

        groupChangesSinceCheckpoint(...args: any[]): void;

        groupLastChanges(...args: any[]): void;

        integrateOperations(...args: any[]): void;

        onDidUpdateMarkers(...args: any[]): void;

        onDidUpdateText(...args: any[]): void;

        receiveFetch(...args: any[]): void;

        receiveOperationsUpdate(...args: any[]): void;

        receiveSave(...args: any[]): void;

        receiveURIUpdate(...args: any[]): void;

        receiveUpdate(...args: any[]): void;

        redo(...args: any[]): any;

        requestSave(...args: any[]): void;

        revertToCheckpoint(checkpoint: Checkpoint, options: any): any;

        serialize(...args: any[]): void;

        setDelegate(delegate: IBufferDelegate): void;

        setTextInRange(oldStart: Position, oldEnd: Position, newText: string): void;

        setURI(...args: any[]): void;

        undo(...args: any[]): any;

        updateMarkers(...args: any[]): void;

        static deserialize(...args: any[]): void;

    }

    export interface IEditorDelegate {
        dispose(): void;
        clearSelectionsForSiteId(siteId: number): void;
        isScrollNeededToViewPosition(position: Position): boolean;
        updateActivePositions(positionsBySiteId: Position[]): void;
        updateSelectionsForSiteId(...args: any[]): void;
        updateTether(state: number, position: Position): void;
    }

    export class EditorProxy {
        id: number;
        siteId: number;
        bufferProxy: BufferProxy;

        constructor(...args: any[]);

        bufferProxyDidUpdateMarkers(...args: any[]): void;

        createLocalSelectionsLayer(...args: any[]): void;

        cursorPositionForSiteId(...args: any[]): void;

        didScroll(...args: any[]): void;

        dispose(...args: any[]): void;

        getLocalHiddenSelections(...args: any[]): void;

        getMetadata(...args: any[]): void;

        hideSelections(...args: any[]): void;

        hostDidDisconnect(...args: any[]): void;

        isScrollNeededToViewPosition(...args: any[]): void;

        onDidScroll(...args: any[]): void;

        onDidUpdateLocalSelections(...args: any[]): void;

        onDidUpdateRemoteSelections(...args: any[]): void;

        receiveFetch(...args: any[]): void;

        receiveSelectionsUpdate(...args: any[]): void;

        receiveUpdate(...args: any[]): void;

        serialize(...args: any[]): void;

        setDelegate(delegate: IEditorDelegate): void;

        showSelections(...args: any[]): void;

        siteDidDisconnect(...args: any[]): void;

        updateSelections(...args: any[]): void;

        static deserialize(...args: any[]): void;

    }

    export class EditorProxyMetadata {
        constructor(...args: any[]);

        dispose(...args: any[]): void;

        receiveBufferUpdate(...args: any[]): void;

        serialize(...args: any[]): void;

        static deserialize(...args: any[]): void;

    }

    export class PeerConnection {
        constructor(...args: any[]);

        connect(...args: any[]): void;

        disconnect(...args: any[]): void;

        finishReceiving(...args: any[]): void;

        getConnectedPromise(...args: any[]): void;

        getDisconnectedPromise(...args: any[]): void;

        handleConnectionStateChange(...args: any[]): void;

        handleDataChannel(...args: any[]): void;

        handleError(...args: any[]): void;

        handleICECandidate(...args: any[]): void;

        handleNegotiationNeeded(...args: any[]): void;

        isConnectionClosed(...args: any[]): void;

        isConnectionOpen(...args: any[]): void;

        receive(...args: any[]): void;

        receiveSignal(...args: any[]): void;

        send(...args: any[]): void;

        sendSignal(...args: any[]): void;

    }

    export class PeerPool {
        constructor(...args: any[]);

        connectTo(...args: any[]): void;

        didDisconnect(...args: any[]): void;

        didReceiveMessage(...args: any[]): void;

        didReceiveSignal(...args: any[]): void;

        disconnect(...args: any[]): void;

        dispose(...args: any[]): void;

        fetchICEServers(...args: any[]): void;

        getConnectedPromise(...args: any[]): void;

        getDisconnectedPromise(...args: any[]): void;

        getLocalPeerIdentity(...args: any[]): void;

        getPeerConnection(...args: any[]): void;

        getPeerIdentity(...args: any[]): void;

        initialize(...args: any[]): void;

        isConnectedToPeer(...args: any[]): void;

        listen(...args: any[]): void;

        onDisconnection(...args: any[]): void;

        onError(...args: any[]): void;

        onReceive(...args: any[]): void;

        peerConnectionDidError(...args: any[]): void;

        send(...args: any[]): void;

    }

    export interface IPortalDelegate {
        dispose(): void;
        updateActivePositions(positionsBySiteId: Position[]): void;
        hostDidLoseConnection(): void
        hostDidClosePortal(): void;
        updateTether(state: number, editorProxy: EditorProxy, position: Position): void;
        siteDidJoin(siteId: number): void;
        siteDidLeave(siteId: number): void;
        didChangeEditorProxies(): void;    
    }

    export class Portal {
        id: string;
        
        constructor(...args: any[]);

        activateEditorProxy(...args: any[]): void;

        activeEditorDidScroll(...args: any[]): void;

        activeEditorDidUpdateLocalSelections(...args: any[]): void;

        activeEditorDidUpdateRemoteSelections(...args: any[]): void;

        activeEditorDidUpdateText(...args: any[]): void;

        activeEditorProxyForSiteId(...args: any[]): void;

        assignNewSiteId(...args: any[]): void;

        bindPeerIdToSiteId(...args: any[]): void;

        broadcastEditorProxyCreation(...args: any[]): void;

        broadcastEditorProxySwitch(...args: any[]): void;

        createBufferProxy(...args: any[]): BufferProxy;

        createEditorProxy(...args: any[]): EditorProxy;

        deserializeBufferProxy(...args: any[]): void;

        deserializeEditorProxy(...args: any[]): void;

        deserializeEditorProxyMetadata(...args: any[]): void;

        didChangeTetherState(...args: any[]): void;

        dispose(...args: any[]): void;

        extendTether(...args: any[]): void;

        fetchBufferProxy(...args: any[]): void;

        fetchEditorProxy(...args: any[]): void;

        findOrFetchBufferProxy(...args: any[]): void;

        findOrFetchEditorProxy(...args: any[]): EditorProxy;

        follow(...args: any[]): void;

        getActiveSiteIds(...args: any[]): string[];

        getEditorProxiesMetadata(...args: any[]): any[];

        getEditorProxyMetadata(...args: any[]): void;

        getFollowedSiteId(): number;

        getLocalActiveEditorProxy(...args: any[]): void;

        getLocalSiteId(...args: any[]): void;

        getSiteIdentity(siteId: number): any;

        initialize(...args: any[]): void;

        join(...args: any[]): void;

        leaderDidUpdate(...args: any[]): void;

        receiveEditorProxyCreation(...args: any[]): void;

        receiveEditorProxySwitch(...args: any[]): void;

        receiveSiteAssignment(...args: any[]): void;

        receiveSubscription(...args: any[]): void;

        receiveTetherUpdate(...args: any[]): void;

        receiveUpdate(...args: any[]): void;

        resolveFollowState(...args: any[]): number;

        resolveLeaderPosition(...args: any[]): void;

        resolveLeaderSiteId(...args: any[]): void;

        retractOrDisconnectTether(...args: any[]): void;

        retractTether(...args: any[]): void;

        sendSubscriptionResponse(...args: any[]): void;

        setDelegate(delegate: IPortalDelegate): Promise<void>;

        setFollowState(...args: any[]): void;

        siteDidLeave(...args: any[]): void;

        subscribeToEditorProxyChanges(...args: any[]): void;

        unfollow(...args: any[]): void;

        updateActivePositions(...args: any[]): void;

    }

    export class PubSubSignalingProvider {
        constructor(...args: any[]);

        connect(...args: any[]): void;

        disconnect(...args: any[]): void;

        subscribe(...args: any[]): void;

    }

    export class PusherPubSubGateway {
        constructor(...args: any[]);

        connect(...args: any[]): void;

        disconnect(...args: any[]): void;

        subscribe(...args: any[]): void;

    }

    export class RestGateway {
        constructor(...args: any[]);

        fetch(...args: any[]): void;

        get(...args: any[]): void;

        getAbsoluteURL(...args: any[]): void;

        getDefaultHeaders(...args: any[]): void;

        post(...args: any[]): void;

        setOauthToken(...args: any[]): void;

    }

    export class Router {
        constructor(...args: any[]);

        dispose(...args: any[]): void;

        notify(...args: any[]): void;

        onNotification(...args: any[]): void;

        onRequest(...args: any[]): void;

        receive(...args: any[]): void;

        receiveNotification(...args: any[]): void;

        receiveRequest(...args: any[]): void;

        receiveResponse(...args: any[]): void;

        request(...args: any[]): void;

        respond(...args: any[]): void;

    }

    export class SocketClusterPubSubGateway {
        constructor(...args: any[]);

        subscribe(...args: any[]): void;

    }

    export class StarOverlayNetwork {
        constructor(...args: any[]);

        broadcast(...args: any[]): void;

        connectTo(...args: any[]): void;

        didLoseConnectionToPeer(...args: any[]): void;

        disconnect(...args: any[]): void;

        dispose(...args: any[]): void;

        forwardBroadcast(...args: any[]): void;

        forwardUnicast(...args: any[]): void;

        getMemberIdentity(...args: any[]): void;

        getMemberIds(...args: any[]): void;

        getPeerId(...args: any[]): void;

        memberDidLeave(...args: any[]): void;

        onMemberJoin(...args: any[]): void;

        onMemberLeave(...args: any[]): void;

        onReceive(...args: any[]): void;

        receive(...args: any[]): void;

        receiveBroadcast(...args: any[]): void;

        receiveJoinNotification(...args: any[]): void;

        receiveJoinRequest(...args: any[]): void;

        receiveJoinResponse(...args: any[]): void;

        receiveLeaveNotification(...args: any[]): void;

        receiveUnicast(...args: any[]): void;

        resetConnectedMembers(...args: any[]): void;

        send(...args: any[]): void;

        unicast(...args: any[]): void;

    }

    export class TeletypeClient {
        constructor(...args: any[]);

        createPortal(...args: any[]): Portal;

        dispose(...args: any[]): void;

        getClientId(...args: any[]): void;

        getLocalUserIdentity(...args: any[]): any;

        initialize(...args: any[]): void;

        isSignedIn(): boolean;

        joinPortal(...args: any[]): Portal;

        onConnectionError(...args: any[]): void;

        onSignInChange(...args: any[]): void;

        peerPoolDidError(...args: any[]): void;

        signIn(oauthToken: string): boolean;

        signOut(): boolean;

    }

    export const FollowState: {
        DISCONNECTED: number;
        EXTENDED: number;
        RETRACTED: number;
    };

    export interface Checkpoint {
        id: number;
        isBarrier: boolean;
        markersSnapshot: any;
    }

    export function convertToProtobufCompatibleBuffer(data: any): any;

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