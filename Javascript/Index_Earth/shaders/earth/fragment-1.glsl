varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vPosition;

uniform sampler2D uDayTexture;
uniform sampler2D uNightTexture;
uniform sampler2D uSpecularCloudsTexture;
uniform vec3 uLightPosition; // The sun's position in world space

void main() {
    // Calculate the direction from the fragment to the light source (the sun)
    vec3 lightDirection = normalize(uLightPosition - vPosition);

    // Calculate the dot product between the light direction and the normal to determine if it's day or night
    float dayNightFactor = dot(vNormal, lightDirection);

    // Fetch the day and night colors from the textures
    vec3 dayColor = texture(uDayTexture, vUv).rgb;
    vec3 nightColor = texture(uNightTexture, vUv).rgb;

    // Blend between day and night based on the light's position using a smooth interpolation
    vec3 color = mix(nightColor, dayColor, smoothstep(-0.2, 0.2, dayNightFactor));

    // Fetch the cloud texture
    vec4 cloudTexture = texture(uSpecularCloudsTexture, vUv);

    // Set the cloud color to white and blend the transparency based on brightness
    vec3 cloudColor = vec3(1.0);  // Clouds should be white

    // Calculate the cloud transparency based on the cloud texture brightness (luminance)
    float cloudBrightness = dot(cloudTexture.rgb, vec3(0.2126, 0.7152, 0.0722));  // Luminance formula
    float cloudAlpha = smoothstep(0.4, 0.8, cloudBrightness);  // Clouds are more visible in lighter areas

    // Multiply the cloud opacity by the dayNightFactor to transition clouds visibility
    cloudAlpha *= smoothstep(-0.2, 0.2, dayNightFactor); // Clouds fade more at night

    // Final color: blend Earth color with cloud color, apply transparency
    gl_FragColor = vec4(mix(color, cloudColor, cloudAlpha), 1.0);

    #include <tonemapping_fragment>
    #include <colorspace_fragment>
}
