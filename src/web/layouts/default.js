import React from "react";
import MainNav from "../viewlets/main-nav";
import MainContent from "../viewlets/main-content";
import Modal from "react-bootstrap/Modal";
import SettingsComponent from "../viewlets/settings";
import PropTypes from "prop-types";

export default class DefaultLayout extends React.Component {

    static propTypes = {
        children: PropTypes.object
    }

    constructor(props) {
        super(props);
        this.state = {
            showSettings: false
        }
    }

    setShowSettings(status) {
        this.setState({showSettings: status});
    }


    render() {
        let _this = this;
        return (
            <div className={"d-flex"}>
                <MainNav setShowSettings={this.setShowSettings.bind(this)} {...this.props}/>
                <MainContent contentChildren={this.props.children}/>
                {
                    this.state.showSettings === true
                        ? <Modal className={"border-0 "}
                                 size="lg"
                                 show={true}
                                 dialogClassName="modal-90w"
                                 backdrop={true}
                            // aria-labelledby="contained-modal-title-vcenter"
                                 centered
                        >
                            <Modal.Body className={"p-2 border-0"}>
                                <SettingsComponent
                                    {...this.props}
                                    onClose={() => _this.setShowSettings(false)}
                                />
                            </Modal.Body>
                        </Modal>
                        : <React.Fragment/>
                }
            </div>
        )
    }
}
