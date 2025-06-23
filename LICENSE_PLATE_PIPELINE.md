# Mini-Project 2: License Plate Reading Pipeline Guide

## Project Overview
**Objective**: Detect and read text from license plates in vehicle images using image processing transformations.

**Input**: Image containing a vehicle with visible license plate
**Output**: Segmented license plate with enhanced text for OCR processing

---

## Complete Transformation Pipeline

### Phase 1: Preprocessing & Enhancement
```
Input Image → Grayscale → Contrast Enhancement → Noise Reduction
```

**Step 1: Input Node**
- Load the vehicle image with license plate

**Step 2: Grayscale Conversion**
- **App Transform**: `grayscale`
- **Equivalent**: `cv2.cvtColor()`, `rgb2gray()`
- Purpose: Simplify processing and focus on intensity patterns

**Step 3: Contrast Enhancement**
- **App Transform**: `colorAdjust`
- **Equivalent**: `cv2.convertScaleAbs()`, `imadjust()`
- Parameters:
  - `brightness`: 0-15
  - `contrast`: 20-40
- Purpose: Improve text visibility and plate contrast

**Step 4: Noise Reduction**
- **App Transform**: `bilateral`
- **Equivalent**: `cv2.bilateralFilter()`, `imfilter()`
- Parameters:
  - `diameter`: 9
  - `sigmaColor`: 75
  - `sigmaSpace`: 75
- Purpose: Reduce noise while preserving edges

### Phase 2: Edge Detection & Feature Enhancement
```
Enhanced Image → Edge Detection → Morphological Operations
```

**Step 5: Edge Detection**
- **App Transform**: `canny`
- **Equivalent**: `cv2.Canny()`, `edge()`
- Parameters:
  - `threshold1`: 50-100
  - `threshold2`: 150-200
- Purpose: Detect text edges and plate boundaries

**Step 6: Morphological Closing**
- **App Transform**: `morphology`
- **Equivalent**: `cv2.morphologyEx(MORPH_CLOSE)`, `imclose()`
- Parameters:
  - `operation`: "close"
  - `kernelSize`: 3-5
  - `iterations`: 1-2
- Purpose: Connect broken text segments

**Step 7: Dilation**
- **App Transform**: `dilate`
- **Equivalent**: `cv2.dilate()`, `imdilate()`
- Parameters:
  - `kernelSize`: 3
  - `iterations`: 1-2
- Purpose: Thicken text for better connectivity

### Phase 3: Rectangle/Plate Detection
```
Processed Edges → Connected Components → Rectangle Filtering
```

**Step 8: Connected Components Analysis**
- **App Transform**: `connectedComponents`
- **Equivalent**: `cv2.connectedComponentsWithStats()`, `bwconncomp()`
- Parameters:
  - `connectivity`: "8"
  - `minArea`: 500-2000
  - `maxArea`: 50000
  - `outputMode`: "filtered"
- Purpose: Find potential plate regions

**Step 9: Contour Detection**
- **App Transform**: `findContours`
- **Equivalent**: `cv2.findContours()`, `bwboundaries()`
- Parameters:
  - `mode`: "external"
  - `method`: "simple"
  - `minContourArea`: 1000
  - `thickness`: 2
  - `color`: "white"
- Purpose: Detect rectangular plate boundaries

### Phase 4: Text Region Enhancement
```
Plate Region → Threshold → Text Enhancement → Character Segmentation
```

**Step 10: Adaptive Thresholding**
- **App Transform**: `adaptiveThreshold`
- **Equivalent**: `cv2.adaptiveThreshold()`, `imbinarize()`
- Parameters:
  - `method`: "gaussian"
  - `blockSize`: 11-15
  - `c`: 2-5
- Purpose: Binarize text with varying lighting

**Step 11: Text Morphology**
- **App Transform**: `morphology`
- **Equivalent**: `cv2.morphologyEx(MORPH_OPEN)`, `imopen()`
- Parameters:
  - `operation`: "open"
  - `kernelSize`: 1-3
  - `iterations`: 1
- Purpose: Clean up text characters

**Step 12: Character Isolation**
- **App Transform**: `connectedComponents`
- **Equivalent**: `cv2.connectedComponentsWithStats()`, `bwconncomp()`
- Parameters:
  - `connectivity`: "8"
  - `minArea`: 50-200
  - `maxArea`: 5000
  - `outputMode`: "filtered"
- Purpose: Isolate individual characters

### Phase 5: Final Text Enhancement
```
Characters → Skeletonization → Final Output
```

**Step 13: Skeleton Analysis** (Optional)
- **App Transform**: `skeletonize`
- **Equivalent**: `skimage.morphology.skeletonize()`, `bwmorph()`
- Parameters:
  - `method`: "zhang-suen"
  - `preserveEndpoints`: true
- Purpose: Analyze character structure

**Step 14: Final Output**
- Node: `output`
- Shows processed image ready for OCR

---

## Specialized Pipelines

### Pipeline A: Horizontal Text Focus
For standard horizontal license plates:

```
Input → Grayscale → Contrast → Canny → Horizontal Morphology → Components → Output
```

**Key Modifications:**
- Use rectangular structuring element (width > height)
- Focus on horizontal edge detection
- Filter components by aspect ratio

### Pipeline B: Perspective Correction
For angled or skewed plates:

**Add before Step 10:**
- **App Transform**: `perspective`
- **Equivalent**: `cv2.warpPerspective()`, `imwarp()`
- Parameters: Correct plate angle to horizontal
- Purpose: Normalize plate orientation for better text recognition

### Pipeline C: Multi-Scale Detection
For plates at various distances:

**Add parallel branches:**
- Different **App**: `resize` scales (50%, 100%, 150%)
- Process each scale separately
- Combine results

---

## Advanced Features

### Hough Line Detection for Plate Boundaries
**Add after Step 5:**
- **App Transform**: `houghLines`
- **Equivalent**: `cv2.HoughLinesP()`, `hough()`
- Parameters:
  - `threshold`: 50-100
  - `minLineLength`: 50-200
  - `lineColor`: "red"
- Purpose: Detect plate edges and orientation

### Color-Based Pre-filtering
**Add before grayscale (for colored plates):**
- **App Transform**: `colorAdjust`
- **Equivalent**: `cv2.inRange()`, `rgb2hsv()`
- Focus on specific color ranges (blue/white, yellow/black)
- Extract plate color combinations

### Text Enhancement Sequence
**Replace Steps 10-12 with:**
1. **App**: `otsuThreshold` (*equiv: graythresh + imbinarize*) - Global binarization
2. **App**: `removeNoise` (*equiv: bwareaopen*) - Remove artifacts
3. **App**: `morphology` (*equiv: imclose*) - Connect text
4. **App**: `fillHoles` (*equiv: imfill*) - Fill character holes

---

## Parameter Guidelines

### License Plate Characteristics
- **Typical Size**: 300-600 pixels width
- **Text Height**: 20-80 pixels
- **Character Spacing**: 5-15 pixels
- **Plate Aspect Ratio**: 2:1 to 5:1

### Recommended Parameters
- **App**: `canny` Thresholds: 50-100, 150-200
- **App**: `morphology` Kernel: 3x3 to 7x7
- **App**: `connectedComponents` Area: 500-50000 pixels
- Character Area: 50-2000 pixels

### Lighting Conditions
- **Bright/Daylight**: Lower **App**: `colorAdjust` contrast enhancement
- **Night/Artificial**: Higher contrast, **App**: `bilateral` noise reduction
- **Shadows**: **App**: `adaptiveThreshold`, local enhancement

---

## Quality Assessment

### Success Indicators
- Clear rectangular plate boundary detected
- Individual characters separated
- Text is high contrast (black on white or vice versa)
- Minimal noise outside plate region

### Common Issues & Solutions

**Problem: Plate not detected**
- Solution: Adjust **App**: `canny` edge detection thresholds
- Check **App**: `connectedComponents` size limits
- Verify **App**: `colorAdjust` enhancement settings

**Problem: Text merged together**
- Solution: Reduce **App**: `morphology` closing
- Use **App**: `morphology` opening operation to separate
- Adjust **App**: `adaptiveThreshold` block size

**Problem: Broken characters**
- Solution: Increase **App**: `morphology` closing
- Use **App**: `fillHoles` transformation
- Reduce **App**: `removeNoise` aggressiveness

**Problem: Background noise**
- Solution: Increase **App**: `connectedComponents` area filters
- Add **App**: `clearBorder` operation
- Use **App**: `bilateral` filter for noise reduction

---

## Integration with OCR

### Preprocessing for OCR Systems
1. **Normalize Size**: **App**: `resize` to standard OCR input size
2. **Enhance Contrast**: Ensure black text on white background
3. **Character Segmentation**: Individual character bounding boxes
4. **Orientation**: Ensure horizontal text alignment

### Output Formats
- **Binary Image**: For traditional OCR engines
- **Component Labels**: For character-wise analysis
- **Bounding Boxes**: For spatial character layout
- **Statistics**: Character count, sizes, positions

### OCR Integration Points
- After Step 12: Standard OCR input
- After Step 13: Enhanced character structure
- Parallel **App**: inspection tools for validation

This pipeline transforms raw vehicle images into clean, OCR-ready license plate text suitable for automated reading systems. 