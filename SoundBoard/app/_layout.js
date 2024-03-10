import { Stack } from 'expo-router';
export default function Layout() {
    return (
        <Stack screenOptions={{
            headerTitle: "",
            headerTintColor: '#16131c',
            headerBackVisible: false,
        }}>
            <Stack.Screen
                name="Home"
                options={{
                    headerShown: false,
                }}
            /> 
        </Stack>
    );
}