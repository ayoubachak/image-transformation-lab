# Grid Extraction Pipeline for Mini Project 3

## Problem Description
Extract a binary grid structure from an image with **uneven illumination** (bright upper-left, dark bottom-right). This is a common computer vision challenge that requires sophisticated preprocessing to handle the illumination gradient.

## Complete Pipeline Solution

### Step 1: Noise Reduction with Median Filter 
**Purpose**: Remove noise while preserving edges

**Transformation**: `Median Filter`
```
- Method: "cross-shaped" (best for preserving grid edges)
- Kernel Size: 3 or 5
- Iterations: 1-2
- Preserve Edges: true
```

**Why**: The cross-shaped median filter removes salt-and-pepper noise while maintaining the sharp edges of the grid lines.

---

### Step 2: Illumination Correction
**Purpose**: Compensate for uneven lighting

**Option A - Background Subtraction**:
```
- Method: "morphological" 
- Kernel Size: 51-101 (larger than grid spacing)
- Normalize: true
```

**Option B - Illumination Correction**:
```
- Method: "retinex" (best for illumination gradients)
- Sigma: 80-120
```

**Why**: These methods estimate and remove the background illumination, leaving only the foreground structure (grid).

---

### Step 3: Local Normalization (Optional but Recommended)
**Purpose**: Ensure uniform contrast across the image

**Transformation**: `Local Normalization`
```
- Method: "mean-std"
- Window Size: 31
- Target Mean: 128
- Target Std: 50
```

**Why**: Even after illumination correction, local contrast variations may remain. This step ensures consistent contrast throughout the image.

---

### Step 4: Sharpening
**Purpose**: Enhance grid line definition

**Transformation**: `Sharpen`
```
- Strength: 1.0-1.5
- Radius: 1.0
```

**Alternative - Top Hat Transform**:
```
- Kernel Size: 15 (smaller than grid spacing)
- Kernel Shape: "ellipse"
- Enhance Contrast: true
```

**Why**: After background removal, the grid lines may be softened. Sharpening restores crisp edges.

---

### Step 5: Threshold Selection
**Purpose**: Convert to binary

**Option A - Otsu Threshold**:
```
- Channels: "grayscale"
- Invert: false (or true, depending on your grid)
```

**Option B - Adaptive Threshold**:
```
- Method: "gaussian"
- Block Size: 11-15
- Constant: 2
```

**Why**: Otsu automatically finds the optimal threshold. If local variations persist, adaptive thresholding works better.

---

### Step 6: Morphological Cleanup
**Purpose**: Remove noise and perfect the grid structure

**Transformation**: `Morphological Operation`
```
- Operation: "close" (to connect broken grid lines)
- Kernel Size: 3
- Iterations: 1-2
```

**Follow with**:
```
- Operation: "open" (to remove small noise)
- Kernel Size: 3
- Iterations: 1
```

---

### Step 7: Final Enhancement (Optional)
**Purpose**: Perfect grid detection

**Option A - Remove Small Objects**:
```
- Noise Type: "small-objects"
- Min Size: 50 (adjust based on expected grid cell size)
- Connectivity: "8"
```

**Option B - Fill Small Holes**:
```
- Connectivity: "8"
- Min Hole Size: 0
- Max Hole Size: 100
```

---

## Alternative Pipeline for Heavy Noise

If your image has significant noise, try this alternative approach:

1. **Bilateral Filter** (preserves edges while reducing noise)
   ```
   - Diameter: 9
   - Sigma Color: 75
   - Sigma Space: 75
   ```

2. **Background Subtraction** (polynomial method for complex gradients)
   ```
   - Method: "polynomial"
   - Polynomial Order: 3-4
   - Normalize: true
   ```

3. **Bottom Hat Transform** (detect dark grid lines on bright background)
   ```
   - Kernel Size: 21
   - Kernel Shape: "ellipse"
   - Enhance Contrast: true
   ```

4. **Threshold + Morphology** (as above)

---

## Parameter Tuning Guidelines

### Grid Cell Size Analysis
- **Small grids** (cell size < 20px): Use smaller kernels (3-7)
- **Medium grids** (cell size 20-50px): Use medium kernels (7-15)
- **Large grids** (cell size > 50px): Use larger kernels (15-31)

### Illumination Gradient Analysis
- **Mild gradient**: Local normalization may be sufficient
- **Strong gradient**: Background subtraction with large kernel
- **Complex lighting**: Retinex or homomorphic filtering

### Noise Level Analysis
Use the **Median Processor's noise analysis**:
```javascript
const analysis = MedianProcessor.analyzeNoise(imageData);
// Use analysis.recommendedMethod for best median filter type
```

---

## Expected Results

After this pipeline:
- ✅ **Clean binary grid** with uniform line thickness
- ✅ **No illumination artifacts** 
- ✅ **Minimal noise** and broken connections
- ✅ **Preserved grid topology**

---

## Quick Start Example

For **immediate results** with Mini Project 3:

1. **Input Image** → **Median Filter** (cross-shaped, size 3)
2. **Background Subtraction** (morphological, size 71)
3. **Sharpen** (strength 1.2)
4. **Otsu Threshold**
5. **Morphological Close** (size 3)

This 5-step pipeline should handle most grid extraction scenarios with uneven illumination.

---

## Troubleshooting

**Problem**: Grid lines are broken
- **Solution**: Increase morphological close kernel size or iterations

**Problem**: Too much noise in result  
- **Solution**: Add morphological open after close, or use adaptive median filter

**Problem**: Uneven brightness still visible
- **Solution**: Increase background subtraction kernel size, or try polynomial method

**Problem**: Grid lines too thick/thin
- **Solution**: Adjust morphological operations or try different threshold method

**Problem**: Lost fine details
- **Solution**: Use cross-shaped median instead of standard, reduce morphological iterations 