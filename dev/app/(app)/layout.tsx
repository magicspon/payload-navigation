import * as React from 'react'

export default function RootLayout({ children }: { children: React.ReactNode }) {
	return (
		<html lang="en">
			<head>
				<title>@spon/payload-navigation</title>
			</head>
			<body>{children}</body>
		</html>
	)
}
