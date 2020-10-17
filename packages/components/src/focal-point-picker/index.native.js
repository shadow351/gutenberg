/**
 * External dependencies
 */
import { Animated, PanResponder, View } from 'react-native';
import Video from 'react-native-video';

/**
 * WordPress dependencies
 */
import { __ } from '@wordpress/i18n';
import { Image, RangeControl } from '@wordpress/components';
import { useRef, useState, useMemo } from '@wordpress/element';
import { MEDIA_TYPE_IMAGE, MEDIA_TYPE_VIDEO } from '@wordpress/block-editor';

/**
 * Internal dependencies
 */
import FocalPoint from './focal-point';
import Tooltip from './tooltip';
import styles from './style.scss';

const MIN_POSITION_VALUE = 0;
const MAX_POSITION_VALUE = 100;

export default function FocalPointPicker( props ) {
	const {
		focalPoint,
		mediaType,
		onChange,
		shouldEnableBottomSheetScroll,
		url,
	} = props;

	const [ containerSize, setContainerSize ] = useState( null );
	const [ sliderKey, setSliderKey ] = useState( 0 );
	const [ tooltipVisible, setTooltipVisible ] = useState( true );
	const [ displayPlaceholder, setDisplayPlaceholder ] = useState( true );
	const [ videoNaturalSize, setVideoNaturalSize ] = useState( null );

	const pan = useRef( new Animated.ValueXY() ).current;

	// Set initial cursor poition
	if ( containerSize ) {
		pan.setValue( {
			x: focalPoint.x * containerSize.width,
			y: focalPoint.y * containerSize.height,
		} );
	}

	const panResponder = useMemo(
		() =>
			PanResponder.create( {
				onStartShouldSetPanResponder: () => true,
				onStartShouldSetPanResponderCapture: () => true,
				onMoveShouldSetPanResponder: () => true,
				onMoveShouldSetPanResponderCapture: () => true,

				onPanResponderGrant: ( event ) => {
					shouldEnableBottomSheetScroll( false );
					const { locationX: x, locationY: y } = event.nativeEvent;
					pan.setValue( { x, y } ); // Set cursor to tap origin
					pan.setOffset( { x: pan.x._value, y: pan.y._value } );
				},
				// Move cursor to match delta drag
				onPanResponderMove: Animated.event( [
					null,
					{ dx: pan.x, dy: pan.y },
				] ),
				onPanResponderRelease: ( event ) => {
					shouldEnableBottomSheetScroll( true );
					setTooltipVisible( false );
					pan.flattenOffset();
					const { locationX: x, locationY: y } = event.nativeEvent;
					setPosition( {
						x: x / containerSize?.width,
						y: y / containerSize?.height,
					} );
					// Slider (child of RangeCell) is uncontrolled, so we must increment a
					// key to re-mount and sync the pan gesture values to the sliders
					// https://git.io/JTe4A
					setSliderKey( ( prevState ) => prevState + 1 );
				},
			} ),
		[ containerSize ]
	);

	function setPosition( { x, y } ) {
		onChange( ( prevState ) => ( {
			...prevState,
			...( x ? { x } : {} ),
			...( y ? { y } : {} ),
		} ) );
	}

	const mediaPlaceholderStyles = [
		displayPlaceholder && styles.mediaPlaceholder,
	];

	const focalPointGroupStyles = [
		styles.focalPointGroup,
		{
			transform: [
				{
					translateX: pan.x.interpolate( {
						inputRange: [ 0, containerSize?.width || 0 ],
						outputRange: [ 0, containerSize?.width || 0 ],
						extrapolate: 'clamp',
					} ),
				},
				{
					translateY: pan.y.interpolate( {
						inputRange: [ 0, containerSize?.height || 0 ],
						outputRange: [ 0, containerSize?.height || 0 ],
						extrapolate: 'clamp',
					} ),
				},
			],
		},
	];

	return (
		<View style={ styles.container }>
			<Tooltip.Overlay>
				<View style={ styles.media }>
					<View
						{ ...panResponder.panHandlers }
						onLayout={ ( event ) => {
							const { height, width } = event.nativeEvent.layout;

							if (
								width !== 0 &&
								height !== 0 &&
								( containerSize?.width !== width ||
									containerSize?.height !== height )
							) {
								setContainerSize( { width, height } );
							}
						} }
						style={ styles.mediaContainer }
					>
						{ MEDIA_TYPE_IMAGE === mediaType && (
							<Image
								height="100%"
								url={ url }
								style={ [ mediaPlaceholderStyles ] }
								onImageDataLoad={ () => {
									setDisplayPlaceholder( false );
								} }
							/>
						) }
						{ MEDIA_TYPE_VIDEO === mediaType && (
							<Video
								muted
								paused
								disableFocus
								onLoad={ ( event ) => {
									const { height, width } = event.naturalSize;
									setVideoNaturalSize( { height, width } );
									setDisplayPlaceholder( false );
								} }
								resizeMode={ 'contain' }
								source={ { uri: url } }
								style={ [
									{
										aspectRatio:
											videoNaturalSize &&
											videoNaturalSize.width /
												videoNaturalSize.height,
										height: '100%',
									},
									mediaPlaceholderStyles,
								] }
							/>
						) }
						<Animated.View
							pointerEvents="none"
							style={ focalPointGroupStyles }
						>
							<Tooltip
								additionalOffset={ { y: -31 } }
								visible={ tooltipVisible }
							/>
							<View style={ styles.focalPointConstraint }>
								<FocalPoint />
							</View>
						</Animated.View>
					</View>
				</View>
				<RangeControl
					inputSuffix="%"
					key={ `xAxis-${ sliderKey }` }
					label={ __( 'X-Axis Position' ) }
					max={ MAX_POSITION_VALUE }
					min={ MIN_POSITION_VALUE }
					onChange={ ( x ) => setPosition( { x: x / 100 } ) }
					value={ Math.round( focalPoint.x * 100 ) }
				/>
				<RangeControl
					inputSuffix="%"
					key={ `yAxis-${ sliderKey }` }
					label={ __( 'Y-Axis Position' ) }
					max={ MAX_POSITION_VALUE }
					min={ MIN_POSITION_VALUE }
					onChange={ ( y ) => setPosition( { y: y / 100 } ) }
					value={ Math.round( focalPoint.y * 100 ) }
				/>
			</Tooltip.Overlay>
		</View>
	);
}
