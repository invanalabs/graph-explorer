import React from 'react';
import BaseComponent from "./base-component";
import {
    AUTH_CONSTANTS,
    DefaultConnectionRetryTimeout,
    DefaultMaxTimeElapsedWarningInSeconds,
    GREMLIN_SERVER_URL, historyLocalStorageKey,
    MAX_HISTORY_COUNT_TO_REMEMBER,
    UUIDGenerator
} from "../config";
import {
    getDataFromLocalStorage, redirectToConnectIfNeeded, setDataToLocalStorage, postData,
} from "./utils";
import LoadSpinner from "../ui-components/spinner/spinner";
import PropTypes from "prop-types";
import HttpConnection from "../connections/http";
import WebSocketConnection from "../connections/websocket";


export default class GremlinBasedComponent extends BaseComponent {
    /*

    Usage

import React from "react";
import GremlinBasedViewBase from "core/gremlin-component";

export default class GremlinQueryBox extends GremlinBasedComponent {

// use makeQuery("g.V().toList()") to query
// use processResponse(responses) method to listen to the responses.

    componentDidMount() {
        super.componentDidMount();
        const _this = this;

        setTimeout(function () {
            _this.makeQuery("g.V().limit(5).toList()", false);
        }, 1000)
    }

    processResponse(responses) {
        console.log("Response is ", responses);
    }

    flushResponsesData(){
        // this will delete responses,
    }



}


     */
    // timer = null;
    // timer2 = null;
    queryElapsedTimerId = null;
    reconnectingTimerId = null;
    queryStartedAt = null;
    queryEndedAt = null;
    ws = null;
    // streamResponses = null;
    static defaultProps = {
        gremlinUrl: GREMLIN_SERVER_URL,
        // reRenderCanvas: () => console.error("reRenderCanvas prop not added for VertexOptions")
    }


    static propTypes = {
        gremlinUrl: PropTypes.string
    }

    constructor(props) {
        super(props);
        this.state = {
            ...this.state,
            isConnected2Gremlin: null,
            query: null,
            isStreaming: null,
            queryElapsedTimeCounter: null,

            responses: [],
            vertices: [],
            edges: []
        }


        const protocol = this.getProtocol();

        if (protocol === "ws") {
            this.connection = new WebSocketConnection(
                this.props.gremlinUrl,
                this.responseEventsCallback.bind(this),
                this._processResponse.bind(this),
                this.setIsConnected2Gremlin.bind(this)
            );
        } else {
            this.connection = new HttpConnection(
                this.props.gremlinUrl,
                this.responseEventsCallback.bind(this),
                this._processResponse.bind(this)
            );
        }

    }

    // updateTransporterStatus

    getProtocol() {
        const _ = new URL(this.props.gremlinUrl).protocol;
        return _.includes("ws") ? "ws" : "http";
    }

    // createWebSocket() {
    //     return new WebSocket(this.props.gremlinUrl);
    // }

    //
    // reconnectWithWS() {
    //     clearInterval(this.queryElapsedTimerId);
    //     clearInterval(this.reconnectingTimerId);
    //     this.ws = this.createWebSocket();
    //     this.connect();
    // }

    setIsConnected2Gremlin(status) {
        // this.props.eventHandler({isConnected2Gremlin: status});
        console.log("setIsConnected2Gremlin", status)
        this.setState({isConnected2Gremlin: status});
    }


    componentDidMount() {
        console.log("gremlin-component componentDidMount")
        let shallConnect = redirectToConnectIfNeeded(this.props.gremlinUrl);
        if (shallConnect) {
            const protocol = this.getProtocol();
            console.log("We will be using " + protocol + " protocol");
            if (protocol === "ws") {
                this.connection.reconnectWithWS()
            } else {
                console.log("protocol will be " + protocol);
            }
        }
    }

    componentWillUnmount() {
        console.log("gremlin-component componentWillUnmount triggered");
        clearInterval(this.queryElapsedTimerId);
        clearInterval(this.reconnectingTimerId);
        super.componentWillUnmount();
    }


    flushCanvas() {
        this.setState({
            responses: [],
            vertices: [],
            edges: [],
            shallReRenderD3Canvas: true,
            selectedElementData: null,
            middleBottomContentName: null
        })
    }

    setQueryElapsedTimeCounter(count) {
        this.setState({queryElapsedTimeCounter: count});
    }

    startQueryTimer() {
        console.log("Timer started")
        this.setQueryElapsedTimeCounter(0);
        let _this = this;
        this.queryElapsedTimerId = setInterval((function () {
                console.log("Timer started xyx", _this.state.queryElapsedTimeCounter, _this.state.isLoading);
                if (_this.state.isLoading === false) {
                    console.log("clearInterval triggered");
                    clearInterval(_this.queryElapsedTimerId);
                }
                _this.updateTimer(_this.state.queryElapsedTimeCounter + 1, false);
                if (_this.state.queryElapsedTimeCounter >= DefaultMaxTimeElapsedWarningInSeconds) {
                    _this.updateTimer(_this.state.queryElapsedTimeCounter + 1, true);
                }
            }
        ), 1000); // check every second.
    }


    setIsStreaming(status) {
        this.setState({isStreaming: status});
    }

    setstatusCode(statusCode) {
        this.setState({"statusCode": statusCode});
    }

    eventTranslator(eventName, eventValue) {
        console.log("===eventName", eventName, eventValue);

        if (eventName === "statusMessage") {
            this.setStatusMessage(eventValue);
        } else if (eventName === "statusCode") {
            this.setstatusCode(eventValue);
        } else if (eventName === "isStreaming") {
            this.setIsStreaming(eventValue);
        } else if (eventName === "errorMessage") {
            this.setErrorMessage(eventValue);
        } else if (eventName === "isConnected") {
            this.setIsConnected2Gremlin(eventValue);
        } else {
            this.setState({eventName: eventValue});
        }
    }


    responseEventsCallback(event) {
        console.log("received event", event);
        for (const [key, value] of Object.entries(event)) {
            this.eventTranslator(key, value)
        }
    }

    //
    // processResponse = (responses) => console.error("processResponse not implemented. This functions " +
    //     "will get the responses from gremlin server. Use this to access the query response data.");

    _processResponse(responses) {
        this.queryEndedAt = new Date();
        this.resetLoader();
        this.processResponse(responses);
    }


    setErrorMessage(message) {
        if (message) {
            this.setState({
                errorMessage: message,
                bottomContentName: "error-console"
            })
        } else {
            this.setState({
                errorMessage: null,
                bottomContentName: null
            })
        }
    }

    addQueryToState(query) {

        this.setState({
            query: query
        })
    }

    setQueryToUrl(query) {
        console.log("===setQueryToUrl", query);
        // let u = new URL(window.location.href);
        // let searchParams = new URLSearchParams(window.location.search);
        // if (query && query !== "null") {
        //     searchParams.set("query", query);
        //     window.history.pushState({}, null, u.origin + u.pathname + "?" + searchParams.toString());
        // }
    }

    addQueryToHistory(query, source) {
        //
        let existingHistory = getDataFromLocalStorage(historyLocalStorageKey, true) || [];

        existingHistory = existingHistory.slice(0, MAX_HISTORY_COUNT_TO_REMEMBER)
        existingHistory.unshift({
            "query": query,
            "source": source,
            "dt": new Date()
        })
        setDataToLocalStorage(historyLocalStorageKey, existingHistory);
    }


    makeQuery(query, queryOptions) {

        /*
            queryOptions.source = "internal|console|canvas"
         */

        // TODO - add logic to wait till server connects.

        if (typeof queryOptions === "undefined") {
            queryOptions = {}
        }
        if (typeof queryOptions.source === "undefined") {
            queryOptions.source = "internal";
        }
        if (queryOptions.source) {
            this.setQueryToUrl(query);
            this.addQueryToState(query)
            this.addQueryToHistory(query, queryOptions.source)
        } // remove this part from here soon.


        this.setState({statusMessage: "Querying..."})
        console.log("queryGremlinServer :::  query", query);
        if (query) {
            // this.startQueryTimer();
            // this.startLoader("Connecting..");
            this.queryStartedAt = new Date();
            this.queryEndedAt = new Date();
            this.connection.query(query);

        }
    }

    render() {
        return (
            <LoadSpinner
                loadingMessage={this.state.loadingMessage}
                isConnected2Gremlin={this.state.isConnected2Gremlin}
                loadingExtraText={this.state.loadingExtraText}
                isLoading={this.state.isLoading}
                showSignOut={true}
                loadTimeCounter={this.state.loaderElapsedTimer}/>
        )
    }
}
