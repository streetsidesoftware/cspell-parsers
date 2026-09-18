#pragma once

// Represents a rectangle with a width and a height.
struct Rectangle {
    int width;
    int height;
};

/**
 * Computes the area of the rectangle.
 */
int area(const struct Rectangle *r);
