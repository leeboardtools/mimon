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
        this._resizeObserver = new ResizeObserver(this.checkLayout);
        this._resizeObserver.observe(this._containerRef.current);
        if (this._headerRef.current) {
            this._resizeObserver.observe(this._headerRef.current);
        }
        if (this._footerRef.current) {
            this._resizeObserver.observe(this._footerRef.current);
        }
    }

    componentWillUnmount() {
        this._resizeObserver.disconnect();
    }


    _getRefHeight(ref) {
        if (!ref.current) {
            return 0;
        }

        return ref.current.getBoundingClientRect().height;
    }

    checkLayout() {
        const containerHeight = this._getRefHeight(this._containerRef);
        const headerHeight = this._getRefHeight(this._headerRef);
        const footerHeight = this._getRefHeight(this._footerRef);
        const contentHeight = containerHeight - headerHeight - footerHeight;

        if (contentHeight !== this.state.contentHeight) {
            this.setState({
                contentHeight: contentHeight
            });
        }
    }


    renderHeader() {
        const { onRenderHeader } = this.props;
        if (onRenderHeader) {
            const header = onRenderHeader();
            if (header) {
                return <div className = "ContentFramer-header"
                    ref = {this._headerRef}
                >
                    {header}
                </div>;
            }
            else if (this._headerRef.current) {
                this._resizeObserver.unobserve(this._headerRef.current);
                this._headerRef.current = undefined;
            }
        }
    }

    renderFooter() {
        const { onRenderFooter } = this.props;
        if (onRenderFooter) {
            const footer = onRenderFooter();
            if (footer) {
                return <div className = "ContentFramer-footer"
                    ref = {this._footerRef}
                >
                    {footer}
                </div>;
            }
            else if (this._footerRef.current) {
                this._resizeObserver.unobserve(this._footerRef.current);
                this._footerRef.current = undefined;
            }
        }
    }

    renderContent() {
        const { onRenderContent, children } = this.props;
        if (onRenderContent || children) {
            let content;
            let style;
            if (onRenderContent) {
                const { contentHeight } = this.state;
                if (contentHeight !== undefined) {
                    style = {
                        height: contentHeight
                    };
                }

                content = onRenderContent({
                    height: contentHeight
                });
            }

            content = content || children;

            return <div className = "Container-fluid Pl-0 Pr-0 ContentFramer-content"
                style = {style}
                ref = {this._contentRef}
            >
                {content}
            </div>;
        }
    }


    render() {
        const { classExtras } = this.props;

        let className = 'Container-fluid P-0'
            + ' FlexC FlexC-column H-100 Overflow-hidden ContentFramer-container';
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
    children: PropTypes.any,
};
