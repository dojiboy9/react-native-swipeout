import NativeButtonImport from "./NativeButton";
import styles from "./styles";
import React, {Component, PropTypes} from "react";
import {PanResponder, TouchableHighlight, StyleSheet, Text, View, Animated, Easing} from "react-native";

export const NativeButton = NativeButtonImport;
export class SwipeoutButton extends Component {

	static propTypes = {
		backgroundColor: PropTypes.string,
		color: PropTypes.string,
		component: PropTypes.node,
		onPress: PropTypes.func,
		text: PropTypes.string,
		type: PropTypes.string,
		underlayColor: PropTypes.string
	};

	static defaultProps = {
		backgroundColor: null,
		color: null,
		component: null,
		underlayColor: null,
		height: 0,
		key: null,
		onPress: null,
		disabled: false,
		text: 'Click me',
		type: '',
		width: 0
	};

	render() {
		let {type, backgroundColor, height, width, color, component, text} = this.props;

		let styleSwipeoutBtn = [styles.swipeoutBtn];

		//  apply "type" styles (delete || primary || secondary)
		if (type === 'delete') styleSwipeoutBtn.push(styles.colorDelete);
		else if (type === 'primary') styleSwipeoutBtn.push(styles.colorPrimary);
		else if (type === 'secondary') styleSwipeoutBtn.push(styles.colorSecondary);

		//  apply background color
		if (backgroundColor) styleSwipeoutBtn.push({backgroundColor});

		styleSwipeoutBtn.push({
			height,
			width,
		});

		let styleSwipeoutBtnComponent = [];

		//  set button dimensions
		styleSwipeoutBtnComponent.push({
			height,
			width,
		});

		let styleSwipeoutBtnText = [styles.swipeoutBtnText];

		//  apply text color
		if (color) styleSwipeoutBtnText.push({color});

		styleSwipeoutBtn.unshift(styles.swipeoutBtnTouchable);
		return (
			<NativeButton
				onPress={this.props.onPress}
				style={styleSwipeoutBtn}
				underlayColor={this.props.underlayColor}
				disabled={this.props.disabled}
				textStyle={styleSwipeoutBtnText}>
				{
					(component ?
							<View style={styleSwipeoutBtnComponent}>{component}</View>
							:
							text
					)
				}
			</NativeButton>
		);
	}
}

export default class Swipeout extends Component {

	static propTypes = {
		autoClose: PropTypes.bool,
		backgroundColor: PropTypes.string,
		close: PropTypes.bool,
		left: PropTypes.array,
		onOpen: PropTypes.func,
		right: PropTypes.array,
		scroll: PropTypes.func,
		style: View.propTypes.style,
		sensitivity: PropTypes.number
	};

	static defaultProps = {
		rowID: -1,
		sectionID: -1,
		sensitivity: 0
	};

	constructor(props) {
		super(props);

		this.state = {
			autoClose: props.autoClose || false,
			btnWidth: 0,
			btnsLeftWidth: 0,
			btnsRightWidth: 0,
			contentHeight: 0,
			contentWidth: 0,
			openedRight: false,
			swiping: false,
			tweenDuration: 160,
			timeStart: null
		};

		this._contentPos = new Animated.Value(0);

		this._onLayout = this._onLayout.bind(this);
		this._handlePanResponderGrant = this._handlePanResponderGrant.bind(this);
		this._handlePanResponderMove = this._handlePanResponderMove.bind(this);
		this._handlePanResponderEnd = this._handlePanResponderEnd.bind(this);
		this._renderButton = this._renderButton.bind(this);
	}

	componentWillMount() {
		this._panResponder = PanResponder.create({
			onStartShouldSetPanResponder: (event, gestureState) => true,
			onMoveShouldSetPanResponder: (event, gestureState) =>
			Math.abs(gestureState.dx) > this.props.sensitivity &&
			Math.abs(gestureState.dy) > this.props.sensitivity,
			onPanResponderGrant: this._handlePanResponderGrant,
			onPanResponderMove: this._handlePanResponderMove,
			onPanResponderRelease: this._handlePanResponderEnd,
			onPanResponderTerminate: this._handlePanResponderEnd,
			onShouldBlockNativeResponder: (event, gestureState) => true,
		});
	}

	componentWillReceiveProps(nextProps) {
		if (nextProps.close) this._close();
	}

	_handlePanResponderGrant(e: Object, gestureState: Object) {
		if (this.props.onOpen) {
			this.props.onOpen(this.props.sectionID, this.props.rowID);
		}
		this.refs.swipeoutContent.measure((ox, oy, width, height) => {
			this.setState({
				btnWidth: (width / 5),
				btnsLeftWidth: this.props.left ? (width / 5) * this.props.left.length : 0,
				btnsRightWidth: this.props.right ? (width / 5) * this.props.right.length : 0,
				swiping: true,
				timeStart: (new Date()).getTime(),
			});
		});
	}

	_handlePanResponderMove(e: Object, gestureState: Object) {
		let posX = gestureState.dx;
		let posY = gestureState.dy;
		let leftWidth = this.state.btnsLeftWidth;
		let rightWidth = this.state.btnsRightWidth;
		if (this.state.openedRight) {
			posX = gestureState.dx - rightWidth;
		} else if (this.state.openedLeft) {
			posX = gestureState.dx + leftWidth;
		}

		//  prevent scroll if moveX is true
		let moveX = Math.abs(posX) > Math.abs(posY);
		if (this.props.scroll) {
			if (moveX) this.props.scroll(false);
			else this.props.scroll(true);
		}
		if (this.state.swiping) {
			//  move content to reveal swipeout
			if (posX < 0 && this.props.right) this._contentPos.setValue(Math.min(posX, 0));
			else if (posX > 0 && this.props.left) this._contentPos.setValue(Math.max(posX, 0));
		}
	}

	_handlePanResponderEnd(e: Object, gestureState: Object) {
		let posX = gestureState.dx;
		let contentPos = this._contentPos._value;
		let contentWidth = this.state.contentWidth;
		let btnsLeftWidth = this.state.btnsLeftWidth;
		let btnsRightWidth = this.state.btnsRightWidth;

		//  minimum threshold to open swipeout
		let openX = contentWidth * 0.33;

		//  should open swipeout
		let openLeft = posX > openX || posX > btnsLeftWidth / 2;
		let openRight = posX < -openX || posX < -btnsRightWidth / 2;

		//  account for open swipeouts
		if (this.state.openedRight) {
			openRight = posX - openX < -openX;
		}
		if (this.state.openedLeft) {
			openLeft = posX + openX > openX;
		}

		//  reveal swipeout on quick swipe
		let timeDiff = (new Date()).getTime() - this.state.timeStart < 200;
		if (timeDiff) {
			openRight = posX < -openX / 10 && !this.state.openedLeft;
			openLeft = posX > openX / 10 && !this.state.openedRight;
		}

		if (this.state.swiping) {
			if (openRight && contentPos < 0 && posX < 0) {
				// open swipeout right
				this._tweenContent('_contentPos', -btnsRightWidth);
				this.setState({openedLeft: false, openedRight: true});
			} else if (openLeft && contentPos > 0 && posX > 0) {
				// open swipeout left
				this._tweenContent('_contentPos', btnsLeftWidth);
				this.setState({openedLeft: true, openedRight: false});
			}
			else {
				// close swipeout
				this._tweenContent('_contentPos', 0);
				this.setState({openedLeft: false, openedRight: false});
			}
		}

		//  Allow scroll
		if (this.props.scroll) this.props.scroll(true);
	}

	_tweenContent(state, endValue) {
		Animated.timing(this[state], {
			easing: Easing.inOut(Easing.quad),
			duration: endValue === 0 ? this.state.tweenDuration * 1.5 : this.state.tweenDuration,
			toValue: endValue
		});
	}

	_rubberBandEasing(value, limit) {
		if (value < 0 && value < limit) return limit - Math.pow(limit - value, 0.85);
		else if (value > 0 && value > limit) return limit + Math.pow(value - limit, 0.85);
		return value;
	}

	_autoClose(btn) {
		let onPress = btn.onPress;
		if (onPress) onPress();
		if (this.state.autoClose) this._close();
	}

	_close() {
		this._tweenContent('_contentPos', 0);
		this.setState({
			openedRight: false,
			openedLeft: false,
		});
	}

	_onLayout(event) {
		let {width, height} = event.nativeEvent.layout;
		this.setState({
			contentWidth: width,
			contentHeight: height,
		});
	}

	_renderButton(btn, i) {
		return (
			<SwipeoutButton
				backgroundColor={btn.backgroundColor}
				color={btn.color}
				component={btn.component}
				disabled={btn.disabled}
				height={this.state.contentHeight}
				key={i}
				onPress={() => this._autoClose(btn)}
				text={btn.text}
				type={btn.type}
				underlayColor={btn.underlayColor}
				width={this.state.btnWidth}/>
		);
	}

	_renderButtons(buttons, isVisible, style) {
		if (buttons && isVisible) {
			return (
				<View style={style}>
					{ buttons.map(this._renderButton) }
				</View>
			);
		} else {
			return (
				<View/>
			);
		}
	}

	render() {
		let contentWidth = this.state.contentWidth;
		let posX = this._contentPos._value;

		let styleSwipeout = [styles.swipeout, this.props.style];
		if (this.props.backgroundColor) {
			styleSwipeout.push([{backgroundColor: this.props.backgroundColor}]);
		}

		let limit = -this.state.btnsRightWidth;
		if (posX > 0) limit = this.state.btnsLeftWidth;

		let styleLeftPos = {
			left: {
				left: 0,
				overflow: 'hidden',
				width: Math.min(limit * (posX / limit), limit),
			},
		};
		let styleRightPos = {
			right: {
				left: Math.abs(contentWidth + Math.max(limit, posX)),
				right: 0,
			},
		};
		let styleContentPos = {
			content: {
				left: this._rubberBandEasing(posX, limit),
			},
		};

		let styleContent = [styles.swipeoutContent];
		styleContent.push(styleContentPos.content);

		let styleRight = [styles.swipeoutBtns];
		styleRight.push(styleRightPos.right);

		let styleLeft = [styles.swipeoutBtns];
		styleLeft.push(styleLeftPos.left);

		let isRightVisible = posX < 0;
		let isLeftVisible = posX > 0;

		return (
			<View style={styleSwipeout}>
				<View
					ref="swipeoutContent"
					style={styleContent}
					onLayout={this._onLayout}
					{...this._panResponder.panHandlers}>
					{this.props.children}
				</View>
				{ this._renderButtons(this.props.right, isRightVisible, styleRight) }
				{ this._renderButtons(this.props.left, isLeftVisible, styleLeft) }
			</View>
		);
	}
}