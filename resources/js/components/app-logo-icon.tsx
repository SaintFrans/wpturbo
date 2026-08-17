import type { SVGAttributes } from 'react';

export default function AppLogoIcon(props: SVGAttributes<SVGElement>) {
    return (
        <svg
            {...props}
            viewBox="0 0 155.2 155.2"
            xmlns="http://www.w3.org/2000/svg"
        >
            <rect width="52.4" height="52.4" />
            <rect x="102.7" y="102.8" width="52.4" height="52.4" />
            <polygon points="52.4 52.5 112.7 52.5 102.7 102.8 42.4 102.8 52.4 52.5" />
            <polygon points="102.7 0 155.1 0 155.1 52.4 102.7 62.4 102.7 0" />
            <polygon points="0 102.8 52.4 92.8 52.4 155.2 0 155.2 0 102.8" />
            <polyline points="102.7 102.8 92.7 52.5 155.2 52.5" />
            <polyline points="52.4 52.5 62.4 102.8 0 102.8" />
        </svg>
    );
}
