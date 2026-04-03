# Error Messages Guide

Understand and resolve messages produced by RPGLE Code Coverage.

## 🚨 Connection Errors

### "Could not establish connection with IBM i"

**Full message:**
```
ERROR: A connection to IBM i could not be established. Verify that Code for IBM i is connected.
```

**Meaning:** The extension cannot connect to your IBM i system via Code for IBM i.

**Solutions:**
1. Install Code for IBM i if it is not present
2. Check the connection status in the status bar
3. Click the connection name and select "Connect"
4. Try disconnecting and reconnecting
5. Restart VS Code if the problem persists

---

## 🔧 Configuration Errors

### "Invalid configuration"

**Full message:**
```
ERROR: programToExecute is required in the codecov configuration. Please configure the program execution command.
```
**Meaning:** The configuration to run code coverage from Visual Studio Code is invalid or missing required fields.

**Solutions:**
1. Open the Configuration Panel (⚙️)
2. Enter the required configuration
3. Click "Save Configuration"
4. The configuration file will be created automatically

---

### "Error trying to view the last execution log"

**Correct format:**
```
ERROR: 📋 No execution log available. Run coverage analysis first to see execution details.
```
**Meaning:** There is no execution log available to show.

**Solution:**
1. Viewing the log requires that a coverage analysis has been executed previously from Visual Studio Code.
2. It is not possible to view the log if coverage was executed directly on IBM i or if no coverage run has been executed yet.
3. Run a coverage analysis first
4. Then try to view the log again

---

### "Error trying to view the last execution log"

```
ERROR: The following libraries are missing from the library list and may impact code coverage analysis: QDEVTOOLS
```
**Meaning:** The `QDEVTOOLS` library is not present in the current job's library list on IBM i.

**Solutions:**

**Option 1: Add to the Library List**
```
Code for IBM i Settings > Connection > Library list
Add: QDEVTOOLS
```
![](../images/ERROR_QDEVTOOLS.png)


**Option 2: Custom CL program**: If the program to execute is a CL that manages its own libraries, add QDEVTOOLS in the CL:
```cl
PGM
   ADDLIBLE LIB(QDEVTOOLS)
   ADDLIBLE LIB(MYLIB)
   CALL PGM(MYLIB/MYPGM)
ENDPGM
```

---

### "Errors during coverage execution"

**Message:**
```
Error: Coverage is in progress; however, errors occurred during the process. 
This is likely due to missing libraries. Please wait for the report to be generated, then review the library list and try again.
```
**Meaning:** During the coverage execution errors were detected that are generally related to objects not found in the library list. This message is informational and does not stop the coverage execution.

**Solutions:**
1. Review the library list to ensure all required libraries are included.
2. Add any missing libraries to the Code for IBM i connection configuration.
3. Review the execution log for specific missing object names. This is the equivalent of job annotations on IBM i.


### "Coverage not available in a thread-capable job"

```
ERROR: STRDBG command not allowed in thread capable job.
```

**Meaning:** This error occurs when the user attempts to run coverage in a thread-capable job. The CODECOV command uses STRDBG internally, and STRDBG is not supported in thread-capable jobs.


**Solution:**
1. Using the Code for IBM i extension, open the user's home directory and find a file named `.bashrc`.

![](../images/ERROR_MULTHILO_PARTE1.png)

2. Open `.bashrc` and add the following line at the end of the file:
```
export QIBM_MULTI_THREADED=N 
```

![](../images/ERROR_MULTHILO_PARTE2.png)

3. Save the changes and close the file.
4. Close and reopen Visual Studio Code for changes to take effect.
5. Try running coverage again.


---

**Related:** [Configuration](configuration.md) | [FAQ](faq.md) 
