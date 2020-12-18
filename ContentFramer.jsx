import React from 'react';
import PropTypes from 'prop-types';


/**
 * React component that lays out a content component to fill in the
 * space between optional header and footer components.
 * <p>
 * This is a main container component holding containers for the header, content,
 * and footer components. It polls the sizes of the main, header, and footer 
 * containers via window.requestAnimationFrame() and sets a CSS height for the
 * content container.
 * <p>
 * For now this only supports vertically stacked header/content/footer.
 */
export class ContentFramer extends React.Component {
    constructor(props) {
        super(props);

        this.checkLayout = this.checkLayout.bind(this);

        this._containerRef = React.createRef();
        this._headerRef = React.createRef();
        this._contentRef = React.createRef();
        this._footerRef = React.createRef();

        this.state = {
        };
    }

    componentDidMount() {
        window.requestAnimationFrame(this.checkLayout);        
    }

    componentWillUnmount() {
        this._willUnmount = true;
    }


    _getRefHeight(ref) {
        if (!ref.current) {
            return 0;
        }

        //return ref.current.clientHeight;
        return ref.current.getBoundingClientRect().height;
    }

    checkLayout() {
        if (this._willUnmount) {
            return;
        }

        const containerHeight = this._getRefHeight(this._containerRef);
        const headerHeight = this._getRefHeight(this._headerRef);
        const footerHeight = this._getRefHeight(this._footerRef);
        const contentHeight = containerHeight - headerHeight - footerHeight;

        if (contentHeight !== this.state.contentHeight) {
            this.setState({
                contentHeight: contentHeight
            });
        }

        window.requestAnimationFrame(this.checkLayout);        
    }


    renderHeader() {
        const { onRenderHeader } = this.props;
        if (onRenderHeader) {
            const header = onRenderHeader();
            return <div className = "ContentFramer-header"
                ref = {this._headerRef}
            >
                {header}
            </div>;
        }
    }

    renderFooter() {
        const { onRenderFooter } = this.props;
        if (onRenderFooter) {
            const footer = onRenderFooter();
            return <div className = "ContentFramer-footer"
                ref = {this._footerRef}
            >
                {footer}
            </div>;
        }
    }

    renderContent() {
        const { onRenderContent } = this.props;
        if (onRenderContent) {
            let style;
            const { contentHeight } = this.state;
            if (contentHeight !== undefined) {
                style = {
                    height: contentHeight
                };
            }

            const content = onRenderContent({
                height: contentHeight
            });

            return <div className = "ContentFramer-content"
                style = {style}
                ref = {this._contentRef}
            >
                <div className = "h-100 overflow-hidden">
                    {content}
                </div>
            </div>;
        }
    }


    render() {
        const { classExtras } = this.props;

        let className = 'container-fluid p-0'
            + ' d-flex flex-column h-100 overflow-hidden ContentFramer-container';
        if (classExtras) {
            className += ' ' + classExtras;
        }
        return <div className = {className}
            ref = {this._containerRef}>
            {this.renderHeader()}
            {this.renderContent()}
            {this.renderFooter()}
        </div>;
    }
}

/**
 * Callback for the rendering functions.
 * @callback ContentFramer~renderCallback
 * @returns {object}    The React compatible component.
 */

/**
 * @typedef {object} ContentFramer~PropTypes
 * @property {ContentFramer~renderCallback} [onRenderHeader]
 * @property {ContentFramer~renderCallback} [onRenderContent]
 * @property {ContentFramer~renderCallback} [onRenderFooter]
 * @property {string} [classExtras] If specified additional CSS classes for the
 * main container.
 */
ContentFramer.propTypes = {
    onRenderHeader: PropTypes.func,
    onRenderContent: PropTypes.func,
    onRenderFooter: PropTypes.func,
    classExtras: PropTypes.string,
};
