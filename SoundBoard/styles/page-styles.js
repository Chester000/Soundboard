import { StyleSheet } from 'react-native';

const styles = StyleSheet.create({
    page: {
        flex: 1,
        backgroundColor: "#16131c",
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 20,
        paddingVertical: 20,
      },
      headerView: {
        position: 'absolute',
        top: 20,
        left: 0,
        right: 0,
        alignItems: 'center',
        justifyContent: 'center',
      },
      welcomeText: {
        fontSize: 18,
        textAlign: 'center',
        marginBottom: 20,
        fontFamily: 'ChalkboardSE-Regular',
        color: '#fff',
      },
 
   
    footerView: {
        position: 'absolute',
        bottom: 50, 
        alignItems: 'center',
        justifyContent: 'center',
    },
});

export default styles;