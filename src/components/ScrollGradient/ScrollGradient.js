/**
 * @file Scroll gradient.
 * @copyright IBM Security 2019
 */

import React, { Component } from 'react';
import classnames from 'classnames';
import { throttle } from 'throttle-debounce';
import PropTypes from 'prop-types';
import hexRgb from 'hex-rgb';

import { isClient } from '../../globals/utils/capabilities';
import { getComponentNamespace } from '../../globals/namespace';

export const namespace = getComponentNamespace('scroll-gradient');

const scrollDirection = { X: 'X', Y: 'Y' };

class ScrollGradient extends Component {
  static propTypes = {
    /** @type {string} A valid HEX, RGB, or RGBA color value. */
    color: PropTypes.string.isRequired,

    /** @type {string} Scroll area children */
    children: PropTypes.oneOfType([
      PropTypes.node,
      PropTypes.arrayOf(PropTypes.node),
    ]),

    /** @type {string} Optional classname */
    className: PropTypes.string,

    /** @type {string} Scroll direction */
    direction: PropTypes.oneOf(['X', 'Y']),

    /** @type {boolean} Set to true if you want to hide gradient on the start side (top or left) of scrollable element. */
    hideStartGradient: PropTypes.bool,

    /** @type {Function} Optional scroll handler */
    onScroll: PropTypes.func,

    /** @type {string} Optional classname for scroll element. */
    scrollElementClassName: PropTypes.string,

    /** @type {(element: HTMLElement) => {}} Optional function to get reference to scrollable DOM element */
    getScrollElementRef: PropTypes.func,
  };

  static defaultProps = {
    className: undefined,
    children: undefined,
    scrollElementClassName: undefined,
    direction: scrollDirection.Y,
    hideStartGradient: false,
    onScroll: () => {},
    getScrollElementRef: () => {},
  };

  /**
   * Gets the scroll state position of a given element.
   * @param {HTMLElement} element The element to get scroll state of.
   * @param {string} scrollDirection The scroll direction to get the state of.
   * @returns {string} State of scroll position.
   * @static
   */
  static getScrollState = (element, scrollDirection) => {
    switch (scrollDirection) {
      case ScrollGradient.ScrollDirection.X: {
        if (element.scrollWidth === element.clientWidth)
          return ScrollGradient.ScrollStates.NONE;
        if (element.scrollLeft === 0)
          return ScrollGradient.ScrollStates.INITIAL;
        if (element.scrollLeft + element.clientWidth === element.scrollWidth)
          return ScrollGradient.ScrollStates.END;
        return ScrollGradient.ScrollStates.STARTED;
      }

      case ScrollGradient.ScrollDirection.Y:
      default: {
        if (element.scrollHeight === element.clientHeight)
          return ScrollGradient.ScrollStates.NONE;
        if (element.scrollTop === 0) return ScrollGradient.ScrollStates.INITIAL;
        if (element.scrollTop + element.clientHeight === element.scrollHeight)
          return ScrollGradient.ScrollStates.END;
        return ScrollGradient.ScrollStates.STARTED;
      }
    }
  };

  state = {
    position: ScrollGradient.ScrollStates.NONE,
  };

  componentDidMount() {
    if (this.scrollContainer) {
      this.updateScrollState();
    }

    if (isClient()) {
      window.addEventListener('resize', this.updateHandler);
    }
  }

  componentDidUpdate() {
    if (
      this.state.position !==
      ScrollGradient.getScrollState(this.scrollContainer, this.props.direction)
    ) {
      this.updateScrollState();
    }
  }

  componentWillUnmount() {
    window.removeEventListener('resize', this.updateHandler);
  }

  /**
   * Saves references of scroll DOM element.
   * @param {HTMLElement} element Scroll DOM element.
   */
  setRefs = element => {
    this.scrollContainer = element;
    this.props.getScrollElementRef(element);
  };

  /** @enum Possible scroll directions  */
  static ScrollDirection = scrollDirection;

  /** @enum Scroll position states */
  static ScrollStates = {
    // No scrolling required because content fits within container.
    NONE: 'NONE',

    // Scroll position is a the start of the scrollable content.
    INITIAL: 'INITIAL',

    // Scroll position is neither at start or end of scrollable content.
    STARTED: 'STARTED',

    // Scroll position is a the end of the scrollable content.
    END: 'END',
  };

  /**
   * Handles scrolling event of scroll element.
   * @param {Event} event Scroll event generated by user.
   */
  scrollHandler = event => {
    this.props.onScroll(event);
    this.updateHandler();
  };

  /**
   * Updates the scroll state of component.
   */
  updateScrollState = () =>
    this.setState({
      position: ScrollGradient.getScrollState(
        this.scrollContainer,
        this.props.direction
      ),
    });

  /**
   * @type {Function} Debounces the execution of scroll state update.
   */
  updateHandler = throttle(150, this.updateScrollState);

  /** @type {HTMLElement} Scrollable element reference. */
  scrollContainer = null;

  render() {
    const {
      className,
      children,
      direction,
      color,
      onScroll,
      scrollElementClassName,
      getScrollElementRef,
      hideStartGradient,
      ...other
    } = this.props;
    const { position } = this.state;

    let rgbCode = null;
    const colorPropWarning = `The \`color\` property "${color}" supplied to \`ScrollGradient\` is not recognized as a valid HEX, RGB, or RGBA color code.`;

    // Check if hex value:
    if (color.startsWith('#')) {
      const colorObject = hexRgb(color);
      rgbCode = `${colorObject.red}, ${colorObject.green}, ${colorObject.blue}`;
    }
    // If not hex, check if RGB or RGBA value:
    else if (color.startsWith('rgb')) {
      // Get comma separated string:
      const colorCode = color.substring(
        color.indexOf('(') + 1,
        color.indexOf(')')
      );
      // Generate array from comma separated string:
      const colorCodeArray = colorCode.split(',');

      // Make sure code is the right length:
      if (colorCodeArray.length === 3 || colorCodeArray.length === 4) {
        rgbCode = `${colorCodeArray[0]}, ${colorCodeArray[1]}, ${
          colorCodeArray[2]
        }`;
      } else {
        console.warn(colorPropWarning);
      }
    } else {
      console.warn(colorPropWarning);
    }

    return (
      <div
        className={classnames(
          namespace,
          `${namespace}--${position.toLowerCase()}`,
          `${namespace}--${direction.toLowerCase()}`,
          className
        )}
        role="presentation"
        {...other}
      >
        {!hideStartGradient && (
          <div
            className={`${namespace}__before`}
            style={{
              backgroundImage: `linear-gradient(to ${
                direction === 'X' ? 'left' : 'top'
              }, rgba(${rgbCode}, 0), rgb(${rgbCode}))`,
            }}
            role="presentation"
            aria-hidden
          />
        )}
        <div
          onScroll={this.scrollHandler}
          ref={this.setRefs}
          className={classnames(
            `${namespace}__content`,
            scrollElementClassName
          )}
        >
          {children}
        </div>
        <div
          className={`${namespace}__after`}
          style={{
            backgroundImage: `linear-gradient(to ${
              direction === 'X' ? 'right' : 'bottom'
            }, rgba(${rgbCode}, 0), rgb(${rgbCode}))`,
          }}
          role="presentation"
          aria-hidden
        />
      </div>
    );
  }
}

export default ScrollGradient;
