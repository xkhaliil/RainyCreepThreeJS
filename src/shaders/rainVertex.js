export default `
  uniform float uTime;
  uniform float uRainYBot;
  uniform float uRainYTop;
  uniform float uStreakLen;

  attribute float aSpeed;
  attribute float aDy;

  varying float vAlpha;

  void main() {
    float range = uRainYTop - uRainYBot;
    float animY = uRainYBot + mod((position.y - uRainYBot) - uTime * aSpeed, range);
    vec3 pos = vec3(position.x, animY + aDy, position.z);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
    // aDy is 0.0 at top vertex, -uStreakLen at bottom — fade bottom (0) to top (1)
    vAlpha = 1.0 + aDy / uStreakLen;
  }
`;
